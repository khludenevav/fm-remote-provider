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

export class FileSystemFileItem {
    readonly isDirectory: boolean = false;
    readonly name: string; // Specifies a file system item's name.
    readonly dateModified: string; // Specifies a timestamp that indicates when the file system item was last modified.
    readonly size: number; // Specifies a file system item's size, in bytes.

    customFields!: Record<string, any>; // Gets the collection of custom fields bound to a file system item.
    key!: string; // Specifies a file system item's key.
    thumbnail!: string; // Specifies an icon (URL) to be used as the file system item's thumbnail.

    constructor(name: string, dateModified: Date, size: number) {
        this.name = name;
        this.dateModified = dateModified.toISOString();
        this.size = size;
    }
}

export class FileSystemDirectoryItem {
    readonly isDirectory: boolean = true;
    readonly name: string; // Specifies a file system item's name.
    readonly dateModified: string; // Specifies a timestamp that indicates when the file system item was last modified.
    readonly hasSubDirectories: boolean; // Specifies whether a file system item (a directory) has subdirectories.

    customFields!: Record<string, any>; // Gets the collection of custom fields bound to a file system item.
    // convert to Date.toISOString() before sending to client
    key!: string; // Specifies a file system item's key.
    thumbnail!: string; // Specifies an icon (URL) to be used as the file system item's thumbnail.

    constructor(name: string, dateModified: Date, hasSubDirectories: boolean) {
        this.name = name;
        this.dateModified = dateModified.toISOString();
        this.hasSubDirectories = hasSubDirectories;
    }
}
export type FileSystemItem = FileSystemFileItem | FileSystemDirectoryItem;
