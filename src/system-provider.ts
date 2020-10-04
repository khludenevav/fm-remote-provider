import * as fs from 'fs';
import * as path from 'path';

import { FileSystemLoadFileContentOptions, IFileContentProvider } from './content-provider';
import { ErrorCode } from './errors';
import { FileSystemDirectoryItem, FileSystemFileItem, FileSystemItem } from './item';
import {
    FileSystemCopyItemOptions, FileSystemCreateDirectoryOptions, FileSystemDeleteItemOptions, FileSystemMoveItemOptions, FileSystemRenameItemOptions,
    IFileSystemItemEditor
} from './item-editor';
import { FileSystemLoadItemOptions, IFileSystemItemLoader } from './item-loader';

export interface IFileSystemProvider extends IFileSystemItemLoader, IFileSystemItemEditor, /* IFileUploader, */ IFileContentProvider {
}

export class PhysicalFileSystemProvider implements IFileSystemProvider {
    public readonly rootDirectoryPath: string;

    constructor(rootDirectoryPath: string) {
        this.rootDirectoryPath = rootDirectoryPath;
    }

    async getItems(options: FileSystemLoadItemOptions): Promise<FileSystemItem[]> {
        const currDir = path.join(this.rootDirectoryPath, options.directory.path);
        return new Promise((resolve, _reject) => {
            fs.readdir(currDir, { withFileTypes: true }, async(_err, files) => {
                const dirResult: FileSystemItem[] = [];
                for(const file of files) {
                    const fullPath = path.join(currDir, file.name);
                    const item = await this.createFileSystemItem(file, fullPath);
                    if(item)
                        dirResult.push(item);
                }
                resolve(dirResult.sort((a, b) => +b.isDirectory - +a.isDirectory));
            });
        });
    }

    // uploadFile(_options: FileSystemUploadFileOptions): void {

    // }

    getFileContent(options: FileSystemLoadFileContentOptions): fs.ReadStream {
        const filePath = path.join(this.rootDirectoryPath, options.file.path);
        return fs.createReadStream(filePath);
    }
    copyItem(_options: FileSystemCopyItemOptions): void {
    }
    async createDirectory(options: FileSystemCreateDirectoryOptions): Promise<null | ErrorCode> {
        const dir = path.join(this.rootDirectoryPath, options.parentDirectory.path, options.directoryName);
        return new Promise(resolve => {
            fs.exists(dir, exists => {
                if(!exists) {
                    fs.mkdir(dir, err => {
                        if(err)
                            resolve(ErrorCode.Other);
                        else
                            resolve(null);
                    });
                }
                else
                    resolve(ErrorCode.DirectoryExists);
            });
        });
    }
    deleteItem(options: FileSystemDeleteItemOptions): Promise<null | ErrorCode> {
        const fullPath = path.join(this.rootDirectoryPath, options.item.path);
        return new Promise(resolve => {
            fs.exists(fullPath, exists => {
                if(options.item.isDirectory) {
                    if(exists) {
                        fs.rmdir(fullPath, err => {
                            if(err)
                                resolve(ErrorCode.Other);
                            else
                                resolve(null);
                        });
                    }
                    else
                        resolve(ErrorCode.DirectoryNotFound);
                }
                else {
                    if(exists) {
                        fs.unlink(fullPath, err => {
                            if(err)
                                resolve(ErrorCode.Other);
                            else
                                resolve(null);
                        });
                    }
                    else
                        resolve(ErrorCode.FileNotFound);
                }
            });
        });
    }
    moveItem(_options: FileSystemMoveItemOptions): void {
    }
    renameItem(options: FileSystemRenameItemOptions): Promise<null | ErrorCode> {
        const oldPath = path.join(this.rootDirectoryPath, options.item.path);
        const newPath = path.join(this.rootDirectoryPath, path.dirname(options.item.path), options.newItemName);
        return new Promise(resolve => {
            fs.exists(oldPath, exists => {
                if(exists) {
                    fs.rename(oldPath, newPath, err => {
                        if(err)
                            resolve(ErrorCode.Other);
                        else
                            resolve(null);
                    });
                }
                else
                    resolve(options.item.isDirectory ? ErrorCode.FileNotFound : ErrorCode.DirectoryNotFound);
            });
        });
    }

    private async createFileSystemItem(file: fs.Dirent, fullPath: string): Promise<FileSystemItem | null> {
        const stats = fs.statSync(fullPath);
        const dateModified = stats.mtime;
        if(file.isFile())
            return new FileSystemFileItem(file.name, dateModified, stats.size);
        else if(file.isDirectory()) {
            const hasSubDirectories = fs.readdirSync(fullPath, { withFileTypes: true }).some(ent => ent.isDirectory());
            return new FileSystemDirectoryItem(file.name, dateModified, hasSubDirectories);
        }
        return null;
    }
}
