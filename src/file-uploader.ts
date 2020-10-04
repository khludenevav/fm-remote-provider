import { ErrorCode } from './errors';
import { FileSystemItemInfo } from './item';

export class FileSystemUploadFileOptions {
    destinationDirectory: FileSystemItemInfo; // Gets information about a directory where files are uploaded.
    fileContent: Buffer | string; // Gets file content. (buffer or path)
    fileName: string;

    constructor(fileName: string, fileContent: Buffer | string, destinationDirectory: FileSystemItemInfo) {
        this.fileName = fileName;
        this.fileContent = fileContent;
        this.destinationDirectory = destinationDirectory;
    }
}

export interface IFileUploader {
    uploadFile(options: FileSystemUploadFileOptions): Promise<ErrorCode | null>;
}
