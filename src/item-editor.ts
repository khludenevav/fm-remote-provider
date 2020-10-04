import { ErrorCode } from './errors';
import { FileSystemItemInfo } from './item';

export interface IFileSystemItemEditor {
    copyItem(options: FileSystemCopyItemOptions): void; // Copies a file system item (file or directory).
    createDirectory(options: FileSystemCreateDirectoryOptions): Promise<null | ErrorCode>; // Creates a directory.
    deleteItem(options: FileSystemDeleteItemOptions): Promise<null | ErrorCode>; // Deletes a file system item (file or directory)
    moveItem(options: FileSystemMoveItemOptions): void; // Moves a file system item (file or directory).
    renameItem(options: FileSystemRenameItemOptions): Promise<null | ErrorCode>; // Renames a file system item (file or directory).
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
