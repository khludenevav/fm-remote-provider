import { FileSystemItem, FileSystemItemInfo } from './item';

export interface IFileSystemItemLoader {
    getItems(options: FileSystemLoadItemOptions): Promise<FileSystemItem[]>;
}

export class FileSystemLoadItemOptions {
    constructor(public readonly directory: FileSystemItemInfo) { }
}
