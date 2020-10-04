import * as fs from 'fs';

import { FileSystemItemInfo } from './item';

export class FileSystemLoadFileContentOptions {
    constructor(public readonly file: FileSystemItemInfo) { }
}

export interface IFileContentProvider {
    getFileContent(options: FileSystemLoadFileContentOptions): fs.ReadStream;
}
