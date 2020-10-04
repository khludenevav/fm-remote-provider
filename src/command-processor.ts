import * as archiver from 'archiver';
import * as path from 'path';
import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as util from 'util';

import { FileSystemLoadFileContentOptions } from './content-provider';
import { getContentType } from './content-type';
import { FileSystemUploadFileOptions } from './file-uploader';
import { FileSystemItemInfo } from './item';
import {
    FileSystemCopyItemOptions, FileSystemCreateDirectoryOptions, FileSystemDeleteItemOptions, FileSystemMoveItemOptions, FileSystemRenameItemOptions
} from './item-editor';
import { FileSystemLoadItemOptions } from './item-loader';
import { IFileSystemProvider, PhysicalFileSystemProvider } from './system-provider';

const appendFile = util.promisify(fs.appendFile);
const unlink = util.promisify(fs.unlink);
const exists = util.promisify(fs.exists);

export type PathInfoType = { name: string, key: string }[];
export type ChunkMetadata = { UploadId: string, FileName: string, Index: number, TotalCount: number /* chunkCount */, FileSize: number };

export type GetDirContentsCommandArguments = { pathInfo: PathInfoType };
export type DownloadCommandArguments = { pathInfoList: PathInfoType[] };
export type CreateDirCommandArguments = { name: string, pathInfo: PathInfoType };
export type RemoveCommandArguments = { pathInfo: PathInfoType, isDirectory: boolean };
export type RenameCommandArguments = { pathInfo: PathInfoType, isDirectory: boolean, name: string };
export type CopyCommandArguments = { sourcePathInfo: PathInfoType, destinationPathInfo: PathInfoType, sourceIsDirectory: boolean };
export type MoveCommandArguments = { sourcePathInfo: PathInfoType, destinationPathInfo: PathInfoType, sourceIsDirectory: boolean };
export type UploadChunkCommandArguments = {
    destinationPathInfo: PathInfoType,
    chunkMetadata: ChunkMetadata,
    file: { buffer: Buffer, encoding: string, mimetype: string, originalname: string, size: number } };
export type AbortUploadCommandArguments = { uploadId: string }; // guid

export interface ResultType extends NodeJS.WritableStream {
    json(json: any): void;
    setHeader(name: string, value: string): void;
    attachment(fileName: string): void;
    status(code: number): this;
    send(obj: any): void;
}

export type RequestType = { method: 'GET' | 'POST', query: any, body: any, files?: any[] }; // files field added by milter on upload command

export class UploadConfiguration {
    chunkSize: number; // Specifies a chunk size in bytes.
    maxFileSize: number; // Specifies the maximum upload file size.

    constructor(maxFileSize: number = Math.pow(2, 53) - 1, chunkSize: number = 1024 * 100) {
        this.maxFileSize = maxFileSize;
        this.chunkSize = chunkSize;
    }
}

export class FileSystemConfiguration {
    allowCopy: boolean = false; // Specifies whether users can copy files and folders.
    allowCreate: boolean = false; // Specifies whether users can create folders.
    allowDelete: boolean = false; // Specifies whether users can delete files and folders.
    allowDownload: boolean = false; // Specifies whether users can download files.
    allowMove: boolean = false; // Specifies whether users can move files and folders.
    allowRename: boolean = false; // Specifies whether users can rename files and folders.
    allowUpload: boolean = false; // Specifies whether users can upload files.

    fileSystemProvider: IFileSystemProvider; // Specifies a file system provider.
    // request: any; // Specifies the HTTP request. // req param in Express
    allowedFileExtensions: string[] = []; // Specifies the allowed file extensions.
    tempDirectory: string; // Specifies the path to the directory where temporary files are stored.
    uploadConfiguration: UploadConfiguration = new UploadConfiguration(); // Specifies file upload configuration settings.

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    constructor(fileSystemProvider: IFileSystemProvider, tempDirectory: string) {
        this.fileSystemProvider = fileSystemProvider;
        this.tempDirectory = tempDirectory;
    }
}

export class FileSystemCommandResult<TResult extends unknown> {
    constructor(public readonly success: boolean, public readonly result: TResult) { }
}

export class FileSystemCommandProcessor {
    constructor(public readonly configuration: FileSystemConfiguration) {}

    execute(_queryCommand: string, _queryArguments: string): FileSystemCommandResult<unknown> {
        // const args = JSON.parse(queryArguments);
        return new FileSystemCommandResult(true, {});
    }

    async executeExpress(req: RequestType, res: ResultType): Promise<void> {
        const query = this.getQuery(req);
        if(!query) {
            // eslint-disable-next-line no-console
            console.warn('No Query');
            return;
        }
        const args: unknown = query.args;
        switch(query.command) {
            case 'GetDirContents': {
                this.getDirContentsCommandHandler(args as GetDirContentsCommandArguments, res);
                break;
            }
            case 'Download': {
                this.downloadCommandHandler(args as DownloadCommandArguments, res);
                break;
            }
            case 'CreateDir': {
                this.createDirCommandHandler(args as CreateDirCommandArguments, res);
                break;
            }
            case 'Remove': {
                this.removeCommandHandler(args as RemoveCommandArguments, res);
                break;
            }
            case 'Rename': {
                this.renameCommandHandler(args as RenameCommandArguments, res);
                break;
            }
            case 'Copy': {
                this.copyCommandHandler(args as CopyCommandArguments, res);
                break;
            }
            case 'Move': {
                this.moveCommandHandler(args as MoveCommandArguments, res);
                break;
            }
            case 'UploadChunk': { // Uploads a file in chunks using multiple requests.
                this.uploadChunkCommandHandler(args as UploadChunkCommandArguments, res);
                break;
            }
            case 'AbortUpload': { // Aborts an upload and deletes a file or a folder.
                this.abortUploadCommandHandler(args as AbortUploadCommandArguments, res);
                break;
            }
        }
    }

    protected getQuery(req: RequestType): { command: string, args: unknown } | null {
        let query: { command: string, arguments: string } | undefined;
        if(req.method === 'GET')
            query = req.query;
        else if(req.method === 'POST')
            query = req.body.command ? req.body : req.query;
        if(query && query.command) {
            const args = JSON.parse(query.arguments);
            if(req.files)
                args.file = req.files[0];
            if(args.chunkMetadata)
                args.chunkMetadata = JSON.parse(args.chunkMetadata);
            return { command: query.command, args };
        }
        else
            return null;
    }

    protected async getDirContentsCommandHandler(args: GetDirContentsCommandArguments, res: ResultType): Promise<void> {
        const currDir = this.getPathInfoPath(args.pathInfo);
        let items = await this.configuration.fileSystemProvider.getItems(new FileSystemLoadItemOptions(new FileSystemItemInfo(currDir, true)));
        if(this.configuration.allowedFileExtensions.length > 0)
            items = items.filter(item => this.configuration.allowedFileExtensions.some(ext => item.isDirectory || item.name.endsWith(ext)));
        res.json({
            success: true,
            result: items,
        });
    }

    protected getPathInfoPath(pathInfo: PathInfoType): string {
        return pathInfo.map((info: { name: string }) => info.name).join(path.sep);
    }

    protected async downloadCommandHandler(args: DownloadCommandArguments, res: ResultType): Promise<void> {
        if(this.configuration.allowDownload) {
            const files = args.pathInfoList.map(pathInfo => this.getPathInfoPath(pathInfo));
            if(args.pathInfoList.length === 1) {
                const currFilePath = files[0];
                const stream = this.configuration.fileSystemProvider.getFileContent(new FileSystemLoadFileContentOptions(new FileSystemItemInfo(currFilePath, false)));
                res.setHeader('content-disposition', `attachment; filename=${path.basename(currFilePath)}`);
                res.setHeader('content-type', getContentType(currFilePath));
                stream.pipe(res);
            }
            else {
                const rootDir = (this.configuration.fileSystemProvider as PhysicalFileSystemProvider).rootDirectoryPath;
                const archive = archiver('zip');
                archive.on('error', (err: any) => {
                    res.status(500).send({ error: err.message });
                });
                res.attachment('files.zip');
                archive.pipe(res);
                for(const file of files)
                    archive.file(path.join(rootDir, file), { name: path.basename(file) });
                archive.finalize();
            }
        }
        else {
            res.json({
                success: false,
            });
        }
    }

    protected async createDirCommandHandler(args: CreateDirCommandArguments, res: ResultType): Promise<void> {
        if(this.configuration.allowCreate) {
            const parentDirectory = this.getPathInfoPath(args.pathInfo);
            const options = new FileSystemCreateDirectoryOptions(new FileSystemItemInfo(parentDirectory, true), args.name);
            const error = await this.configuration.fileSystemProvider.createDirectory(options);
            res.json({
                success: error === null,
            });
        }
        else {
            res.json({
                success: false,
            });
        }
    }

    protected async removeCommandHandler(args: RemoveCommandArguments, res: ResultType): Promise<void> {
        if(this.configuration.allowDelete) {
            const fullPath = this.getPathInfoPath(args.pathInfo);
            const options = new FileSystemDeleteItemOptions(new FileSystemItemInfo(fullPath, args.isDirectory));
            const error = await this.configuration.fileSystemProvider.deleteItem(options);
            res.json({
                success: error === null,
            });
        }
        else {
            res.json({
                success: false,
            });
        }
    }

    protected async renameCommandHandler(args: RenameCommandArguments, res: ResultType): Promise<void> {
        if(this.configuration.allowCreate) {
            const parentDirectory = this.getPathInfoPath(args.pathInfo);
            const options = new FileSystemRenameItemOptions(new FileSystemItemInfo(parentDirectory, args.isDirectory), args.name);
            const error = await this.configuration.fileSystemProvider.renameItem(options);
            res.json({
                success: error === null,
            });
        }
        else {
            res.json({
                success: false,
            });
        }
    }

    protected async copyCommandHandler(args: CopyCommandArguments, res: ResultType): Promise<void> {
        if(this.configuration.allowCopy) {
            const sourcePath = this.getPathInfoPath(args.sourcePathInfo);
            const destPath = this.getPathInfoPath(args.destinationPathInfo);
            const options = new FileSystemCopyItemOptions(
                new FileSystemItemInfo(sourcePath, args.sourceIsDirectory),
                new FileSystemItemInfo(destPath, true));
            const error = await this.configuration.fileSystemProvider.copyItem(options);
            res.json({
                success: error === null,
            });
        }
        else {
            res.json({
                success: false,
            });
        }
    }
    protected async moveCommandHandler(args: CopyCommandArguments, res: ResultType): Promise<void> {
        if(this.configuration.allowCopy) {
            const sourcePath = this.getPathInfoPath(args.sourcePathInfo);
            const destPath = this.getPathInfoPath(args.destinationPathInfo);
            const options = new FileSystemMoveItemOptions(
                new FileSystemItemInfo(sourcePath, args.sourceIsDirectory),
                new FileSystemItemInfo(destPath, true));
            const error = await this.configuration.fileSystemProvider.moveItem(options);
            res.json({
                success: error === null,
            });
        }
        else {
            res.json({
                success: false,
            });
        }
    }

    protected async uploadChunkCommandHandler(args: UploadChunkCommandArguments, res: ResultType): Promise<void> {
        if(this.configuration.allowUpload) {
            if(args.chunkMetadata.Index >= args.chunkMetadata.TotalCount) {
                res.json({
                    success: false,
                });
                return;
            }
            try {
                await this.ensureTmpDirCreated();
                const tmpFilePath = this.getFilePath(args.chunkMetadata.UploadId);
                await appendFile(tmpFilePath, args.file.buffer);
                if(args.chunkMetadata.Index === args.chunkMetadata.TotalCount - 1) {
                    const destPath = this.getPathInfoPath(args.destinationPathInfo);
                    const options = new FileSystemUploadFileOptions(args.chunkMetadata.FileName,
                        tmpFilePath,
                        new FileSystemItemInfo(destPath, true));
                    const error = await this.configuration.fileSystemProvider.uploadFile(options);
                    unlink(tmpFilePath);
                    res.json({
                        success: error === null,
                    });
                }
                else {
                    res.json({
                        success: true,
                    });
                }
            }
            catch(e) {
                res.json({
                    success: false,
                });
                return;
            }
        }
        else {
            res.json({
                success: false,
            });
        }
    }

    protected async abortUploadCommandHandler(args: AbortUploadCommandArguments, res: ResultType): Promise<void> {
        const tmpFilePath = this.getFilePath(args.uploadId);
        if(await exists(tmpFilePath))
            unlink(tmpFilePath);
        res.json({
            success: true,
        });
    }

    protected getFilePath(uploadId: string): string {
        return path.join(this.configuration.tempDirectory, 'dxFmUpload-' + uploadId);
    }
    protected async ensureTmpDirCreated(): Promise<void> {
        return fse.ensureDir(this.configuration.tempDirectory);
    }
}
