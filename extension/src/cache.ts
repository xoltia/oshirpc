type Entry = {
    val: any;
    exp: number;
};

export default class ExpiringCache {
    constructor(
        private storage: Storage = localStorage,
        private storagePrefix: string = "cache",
    ) { }

    private getKey(key: string): string {
        return `${this.storagePrefix}:${key}`;
    }

    private isExpired(entry: Entry): boolean {
        return entry.exp < Date.now();
    }

    get(key: string): any | null {
        const item = this.storage.getItem(this.getKey(key));
        if (!item) return null;

        const entry: Entry = JSON.parse(item);
        if (this.isExpired(entry)) {
            this.storage.removeItem(this.getKey(key));
            return null;
        }

        return entry.val;
    }

    set(key: string, val: any, ttl: number): void {
        const entry: Entry = {
            val,
            exp: Date.now() + ttl * 1000,
        };
        this.storage.setItem(this.getKey(key), JSON.stringify(entry));
    }
}
