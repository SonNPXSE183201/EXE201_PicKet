type Transaction = {
  runAsync(sql: string, ...params: string[]): Promise<unknown>;
};
type Database = Transaction & {
  getFirstAsync(sql: string, ...params: string[]): Promise<unknown>;
  withExclusiveTransactionAsync(operation: (tx: Transaction) => Promise<void>): Promise<void>;
};

export const ownerCacheRetirementSchema = `CREATE TABLE IF NOT EXISTS retired_cache_owners (
  user_id TEXT PRIMARY KEY NOT NULL
)`;

export function createOwnerCacheDatabaseDriver(database: () => Promise<Database>) {
  return {
    isRetired: async (owner: string) => Boolean(await (await database()).getFirstAsync(
      "SELECT user_id FROM retired_cache_owners WHERE user_id = ?", owner,
    )),
    retire: async (owner: string) => {
      const db = await database();
      // The marker and erasure commit together, including after process restart.
      await db.withExclusiveTransactionAsync(async tx => {
        await tx.runAsync("INSERT OR IGNORE INTO retired_cache_owners (user_id) VALUES (?)", owner);
        await tx.runAsync("DELETE FROM cached_resources WHERE user_id = ?", owner);
      });
    },
    resume: async (owner: string) => {
      await (await database()).runAsync("DELETE FROM retired_cache_owners WHERE user_id = ?", owner);
    },
  };
}
