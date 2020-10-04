import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as util from 'util';

import { FileSystemLoadFileContentOptions, IFileContentProvider } from './content-provider';
import { ErrorCode } from './errors';
import { FileSystemUploadFileOptions, IFileUploader } from './file-uploader';
import { FileSystemDirectoryItem, FileSystemFileItem, FileSystemItem } from './item';
import {
    FileSystemCopyItemOptions, FileSystemCreateDirectoryOptions, FileSystemDeleteItemOptions, FileSystemMoveItemOptions, FileSystemRenameItemOptions,
    IFileSystemItemEditor
} from './item-editor';
import { FileSystemLoadItemOptions, IFileSystemItemLoader } from './item-loader';

const exists = util.promisify(fs.exists);
const mkdir = util.promisify(fse.mkdir);
const readdir = util.promisify(fs.readdir);
const stat = util.promisify(fs.stat);
const rename = util.promisify(fs.rename);
const writeFile = util.promisify(fs.writeFile);

export interface IFileSystemProvider extends IFileSystemItemLoader, IFileSystemItemEditor, IFileUploader, IFileContentProvider {
}

export class PhysicalFileSystemProvider implements IFileSystemProvider {
    public readonly rootDirectoryPath: string;

    constructor(rootDirectoryPath: string) {
        this.rootDirectoryPath = rootDirectoryPath;
    }

    async getItems(options: FileSystemLoadItemOptions): Promise<FileSystemItem[]> {
        const currDir = path.join(this.rootDirectoryPath, options.directory.path);
        const files = await readdir(currDir, { withFileTypes: true });
        const dirResult: FileSystemItem[] = [];
        for(const file of files) {
            const fullPath = path.join(currDir, file.name);
            const item = await this.createFileSystemItem(file, fullPath);
            if(item)
                dirResult.push(item);
        }
        return dirResult.sort((a, b) => +b.isDirectory - +a.isDirectory);
    }

    async uploadFile(options: FileSystemUploadFileOptions): Promise<ErrorCode | null> {
        const destPath = path.join(this.rootDirectoryPath, options.destinationDirectory.path, options.fileName);
        try {
            if(typeof options.fileContent === 'string')
                await fse.copyFile(options.fileContent, destPath);
            else
                await writeFile(destPath, options.fileContent);
            return null;
        }
        catch(e) {
            return ErrorCode.Other;
        }
    }

    getFileContent(options: FileSystemLoadFileContentOptions): fs.ReadStream {
        const filePath = path.join(this.rootDirectoryPath, options.file.path);
        return fs.createReadStream(filePath);
    }

    async createDirectory(options: FileSystemCreateDirectoryOptions): Promise<null | ErrorCode> {
        const dirPath = path.join(this.rootDirectoryPath, options.parentDirectory.path, options.directoryName);
        if(await exists(dirPath))
            return ErrorCode.DirectoryExists;
        try {
            await mkdir(dirPath);
        }
        catch(e) {
            return ErrorCode.Other;
        }
        return null;
    }

    async deleteItem(options: FileSystemDeleteItemOptions): Promise<null | ErrorCode> {
        const fullPath = path.join(this.rootDirectoryPath, options.item.path);
        if(!await exists(fullPath))
            return options.item.isDirectory ? ErrorCode.DirectoryNotFound : ErrorCode.FileNotFound;
        try {
            await fse.remove(fullPath);
        }
        catch(e) {
            return ErrorCode.Other;
        }
        return null;
    }

    async copyItem(options: FileSystemCopyItemOptions): Promise<null | ErrorCode> {
        const sourcePath = path.join(this.rootDirectoryPath, options.item.path);
        const destDirPath = path.join(this.rootDirectoryPath, options.destinationDirectory.path);
        if(!await exists(sourcePath))
            return options.item.isDirectory ? ErrorCode.DirectoryNotFound : ErrorCode.FileNotFound;
        try {
            await fse.ensureDir(destDirPath);
            const basename = path.basename(sourcePath);
            const extension = path.extname(basename);
            let name = basename.substr(0, basename.length - extension.length); // without extension
            let dPath = path.join(destDirPath, name + extension);
            if(dPath === sourcePath) {
                do {
                    name += ' - Copy';
                    dPath = path.join(destDirPath, name + extension);
                } while(await exists(dPath));
            }
            await fse.copy(sourcePath, dPath, { recursive: true });
        }
        catch(e) {
            return ErrorCode.Other;
        }
        return null;
    }

    async moveItem(options: FileSystemMoveItemOptions): Promise<null | ErrorCode> {
        const sourcePath = path.join(this.rootDirectoryPath, options.item.path);
        const destDirPath = path.join(this.rootDirectoryPath, options.destinationDirectory.path);
        if(!await exists(sourcePath))
            return options.item.isDirectory ? ErrorCode.DirectoryNotFound : ErrorCode.FileNotFound;
        try {
            await fse.ensureDir(destDirPath);
            const dPath = path.join(destDirPath, path.basename(sourcePath));
            if(sourcePath === dPath)
                return ErrorCode.Other;
            if(await exists(dPath))
                return options.item.isDirectory ? ErrorCode.DirectoryExists : ErrorCode.FileExists;
            await fse.move(sourcePath, dPath);
        }
        catch(e) {
            return ErrorCode.Other;
        }
        return null;
    }

    async renameItem(options: FileSystemRenameItemOptions): Promise<null | ErrorCode> {
        const oldPath = path.join(this.rootDirectoryPath, options.item.path);
        const newPath = path.join(this.rootDirectoryPath, path.dirname(options.item.path), options.newItemName);
        if(!await exists(oldPath))
            return options.item.isDirectory ? ErrorCode.FileNotFound : ErrorCode.DirectoryNotFound;
        if(oldPath === newPath)
            return ErrorCode.Other;
        try {
            await rename(oldPath, newPath);
        }
        catch(e) {
            return ErrorCode.Other;
        }
        return null;
    }

    private async createFileSystemItem(file: fs.Dirent, fullPath: string): Promise<FileSystemItem | null> {
        const stats = await stat(fullPath);
        const dateModified = stats.mtime;
        if(file.isFile())
            return new FileSystemFileItem(file.name, dateModified, stats.size);
        else if(file.isDirectory()) {
            try {
                const files = await readdir(fullPath, { withFileTypes: true });
                const hasSubDirectories = files.some(ent => ent.isDirectory());
                return new FileSystemDirectoryItem(file.name, dateModified, hasSubDirectories);
            }
            catch(e) {
                return null;
            }
        }
        return null;
    }
}
