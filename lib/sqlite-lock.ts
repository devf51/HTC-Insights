import type { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// ไฟล์นี้ต้อง pure — tests/sqlite-lock.test.mjs import ตรงด้วย Node ห้าม import ค่าจริงเพิ่ม (import type ได้)
//
// adapter ของ better-sqlite3 ใช้การเชื่อมต่อเดียว และล็อก mutex เฉพาะ startTransaction
// query ธรรมดาจากคำขออื่นจึงแทรกเข้าไปในทรานแซกชันที่เปิดค้างอยู่ได้ — ถ้าทรานแซกชันนั้น rollback
// การเขียนของคำขออื่นหายไปด้วยทั้งที่ตอบผู้ใช้ไปแล้วว่าสำเร็จ
// ตัวห่อนี้ให้ query ธรรมดารอคิวเดียวกับทรานแซกชัน · query ภายในทรานแซกชันวิ่งผ่านอ็อบเจกต์ทรานแซกชัน ไม่ติดล็อกนี้

type Factory = InstanceType<typeof PrismaBetterSqlite3>;
type Adapter = Awaited<ReturnType<Factory["connect"]>>;

/** คิวทีละงาน — คืนฟังก์ชันปลดล็อก (เรียกซ้ำได้ ไม่ปลดเกิน) */
function createLock() {
  let tail = Promise.resolve();
  return async (): Promise<() => void> => {
    let open!: () => void;
    const done = new Promise<void>((r) => (open = r));
    const ready = tail;
    tail = tail.then(() => done);
    await ready;
    let released = false;
    return () => {
      if (!released) {
        released = true;
        open();
      }
    };
  };
}

function serialize(base: Adapter): Adapter {
  const lock = createLock();
  const run = async <T>(fn: () => Promise<T>): Promise<T> => {
    const release = await lock();
    try {
      return await fn();
    } finally {
      release();
    }
  };
  // Object.create: เมธอดอื่น (getConnectionInfo, dispose, ...) ตกไปที่ตัวจริง
  return Object.assign(Object.create(base) as Adapter, {
    queryRaw: (q: Parameters<Adapter["queryRaw"]>[0]) => run(() => base.queryRaw(q)),
    executeRaw: (q: Parameters<Adapter["executeRaw"]>[0]) => run(() => base.executeRaw(q)),
    executeScript: (s: string) => run(() => base.executeScript(s)),
    startTransaction: async (iso?: Parameters<Adapter["startTransaction"]>[0]) => {
      const release = await lock();
      try {
        const tx = await base.startTransaction(iso);
        return Object.assign(Object.create(tx) as typeof tx, {
          commit: () => tx.commit().finally(release),
          rollback: () => tx.rollback().finally(release),
        });
      } catch (e) {
        release();
        throw e;
      }
    },
  });
}

/** factory ที่ทุก query ธรรมดารอทรานแซกชันที่เปิดอยู่ปิดก่อน — lib/db.ts ใช้ตัวนี้ */
export function serializedAdapter(factory: Factory): Pick<Factory, "provider" | "adapterName" | "connect" | "connectToShadowDb"> {
  return {
    provider: factory.provider,
    adapterName: factory.adapterName,
    connect: async () => serialize(await factory.connect()),
    connectToShadowDb: async () => serialize(await factory.connectToShadowDb()),
  };
}
