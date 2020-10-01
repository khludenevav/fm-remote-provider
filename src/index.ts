// import * as fs from 'fs';
// import * as path from 'path';

export class FileSystemItemInfo {
    isDirectory: boolean;
    key!: string;
    name!: string;
    path: string;
    pathKeys: string[];

    constructor(path: string, isDirectory: boolean, pathKeys?: string[]) {
        this.path = path;
        this.isDirectory = isDirectory;
        this.pathKeys = pathKeys ?? [];
    }
}

export class FileSystemItem {
    customFields!: Record<string, any>; // Gets the collection of custom fields bound to a file system item.
    dateModified!: Date; // Specifies a timestamp that indicates when the file system item was last modified.
    hasSubDirectories!: boolean; // Specifies whether a file system item (a directory) has subdirectories.
    isDirectory!: boolean; // Specifies whether a file system item is a directory.
    key!: string; // Specifies a file system item's key.
    name!: string; // Specifies a file system item's name.
    size!: number; // Specifies a file system item's size, in bytes.
    thumbnail!: string; // Specifies an icon (URL) to be used as the file system item's thumbnail.
}

export class FileSystemLoadItemOptions {
    constructor(public readonly directory: FileSystemItemInfo) { }
}

export interface IFileSystemItemLoader {
    getItems(options: FileSystemLoadItemOptions): FileSystemItem[]; // nit array but enumerable
}

export class FileSystemItemActionOptionsBase {
    constructor(public item: FileSystemItemInfo) {}
}

export class FileSystemCopyItemOptions extends FileSystemItemActionOptionsBase {
    destinationDirectory: FileSystemItemInfo;

    constructor(item: FileSystemItemInfo, destinationDirectory: FileSystemItemInfo) {
        super(item);
        this.destinationDirectory = destinationDirectory;
    }
}
export class FileSystemMoveItemOptions extends FileSystemItemActionOptionsBase {
    destinationDirectory: FileSystemItemInfo;

    constructor(item: FileSystemItemInfo, destinationDirectory: FileSystemItemInfo) {
        super(item);
        this.destinationDirectory = destinationDirectory;
    }
}

export class FileSystemRenameItemOptions extends FileSystemItemActionOptionsBase {
    newItemName: string;

    constructor(item: FileSystemItemInfo, newItemName: string) {
        super(item);
        this.newItemName = newItemName;
    }
}

export class FileSystemCreateDirectoryOptions {
    constructor(public readonly parentDirectory: FileSystemItemInfo, public readonly directoryName: string) {}
}

export class FileSystemDeleteItemOptions extends FileSystemItemActionOptionsBase {
}

// export class FileSystemUploadFileOptions {
//     destinationDirectory: FileSystemItemInfo; // Gets information about a directory where files are uploaded.
//     fileContent: any; // Gets file content.
//     fileName: string; // Gets the uploaded file name.
//     tempFile: FileInfo; // Gets a temporary file.

//     constructor(fileName: string, tempFile: FileInfo /* Stream also possible */, destinationDirectory: FileSystemItemInfo) {
//         this.fileName = fileName;
//         this.tempFile = tempFile;
//         this.destinationDirectory = destinationDirectory;
//     }
// }

// interface IFileUploader {
//     uploadFile(options: FileSystemUploadFileOptions): void;
// }

export interface IFileSystemItemEditor {
    copyItem(options: FileSystemCopyItemOptions): void; // Copies a file system item (file or directory).
    createDirectory(options: FileSystemCreateDirectoryOptions): void; // Creates a directory.
    deleteItem(options: FileSystemDeleteItemOptions): void; // Deletes a file system item (file or directory)
    moveItem(options: FileSystemMoveItemOptions): void; // Moves a file system item (file or directory).
    renameItem(options: FileSystemRenameItemOptions): void; // Renames a file system item (file or directory).
}

export class FileSystemLoadFileContentOptions {
    constructor(public readonly file: FileSystemItemInfo) { }
}

export interface IFileContentProvider {
    getFileContent(options: FileSystemLoadFileContentOptions): any; // returns stream
}

export class UploadConfiguration {
    chunkSize: number; // Specifies a chunk size in bytes.
    maxFileSize: number; // Specifies the maximum upload file size.

    constructor(maxFileSize: number = Math.pow(2, 53) - 1, chunkSize: number = 1024 * 100) {
        this.maxFileSize = maxFileSize;
        this.chunkSize = chunkSize;
    }
}

export interface IFileSystemProvider extends IFileSystemItemLoader, IFileSystemItemEditor, /* IFileUploader, */ IFileContentProvider {
}

export class PhysicalFileSystemProvider implements IFileSystemProvider {
    public readonly rootDirectoryPath: string;

    constructor(rootDirectoryPath: string) {
        this.rootDirectoryPath = rootDirectoryPath;
    }

    getItems(_options: FileSystemLoadItemOptions): FileSystemItem[] {
        // const args = JSON.parse(req.query.arguments);
        // const currDir = path.join(documentsDir, args.pathInfo.map(info => info.name).join(path.sep));
        // console.log(currDir);
        // fs.readdir(currDir, { withFileTypes : true }, (err, files) => {
        //     const dirResult = [];
        //     for(const file of files) {
        //         const fullPath = path.join(currDir, file.name);
        //         const stats = fs.statSync(fullPath);
        //         const dateModified = stats.mtime.toISOString();
        //         if(file.isFile()) {
        //             dirResult.push({
        //                 isDirectory: false,
        //                 name: file.name,
        //                 size: stats.size,
        //                 dateModified: dateModified
        //             });
        //         }
        //         else if(file.isDirectory()) {
        //             dirResult.push({
        //                 isDirectory: true,
        //                 name: file.name,
        //                 hasSubDirectories: fs.readdirSync(fullPath, { withFileTypes: true }).some(ent => ent.isDirectory()),
        //                 dateModified: dateModified
        //             });
        //         }
        //     }
        //     res.json({
        //         errorId: null,
        //         success: true,
        //         result: dirResult.sort((a, b) => +b.isDirectory - +a.isDirectory),
        //     });
        // });
        return [];
    }

    // uploadFile(_options: FileSystemUploadFileOptions): void {

    // }

    getFileContent(_options: FileSystemLoadFileContentOptions): any {
        return null;
    }
    copyItem(_options: FileSystemCopyItemOptions): void {
    }
    createDirectory(_options: FileSystemCreateDirectoryOptions): void {
    }
    deleteItem(_options: FileSystemDeleteItemOptions): void {
    }
    moveItem(_options: FileSystemMoveItemOptions): void {
    }
    renameItem(_options: FileSystemRenameItemOptions): void {
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
    request: any; // Specifies the HTTP request. // req param in Express
    allowedFileExtensions: string[] = []; // Specifies the allowed file extensions.
    tempDirectory: string; // Specifies the path to the directory where temporary files are stored.
    uploadConfiguration: UploadConfiguration = new UploadConfiguration(); // Specifies file upload configuration settings.

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    constructor(request: any, fileSystemProvider: IFileSystemProvider, tempDirectory: string) {
        this.request = request;
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

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    executeExpress(_req: any, _res: any): void {

    }
}
