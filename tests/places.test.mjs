import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePlaces, placesEnabled, searchPlaces } from "../lib/places.ts";

const SAMPLE = {
  local_results: [
    {
      place_id: "ChIJ1",
      title: "  บริษัท ทดสอบ จำกัด ",
      address: "ถ.เพชรเกษม หาดใหญ่",
      phone: "074 000 000",
      website: "https://example.com",
      gps_coordinates: { latitude: 7.01, longitude: 100.47 },
    },
    { place_id: "ChIJ2", title: "ร้านไม่มีพิกัด", gps_coordinates: "junk" },
    { title: "ไม่มี place_id" },
    { place_id: "ChIJ3", title: "   " },
    null,
    "junk",
  ],
};

test("parsePlaces แปลงผล SerpApi และข้ามแถวที่ไม่มี place_id หรือชื่อ", () => {
  assert.deepEqual(parsePlaces(SAMPLE), [
    {
      placeId: "ChIJ1",
      name: "บริษัท ทดสอบ จำกัด",
      address: "ถ.เพชรเกษม หาดใหญ่",
      lat: 7.01,
      lng: 100.47,
      phone: "074 000 000",
      website: "https://example.com",
    },
    { placeId: "ChIJ2", name: "ร้านไม่มีพิกัด", address: null, lat: null, lng: null, phone: null, website: null },
  ]);
});

test("parsePlaces รับ place_results เดี่ยว", () => {
  assert.deepEqual(
    parsePlaces({ place_results: { place_id: "P1", title: "ที่เดียว" } }).map((p) => p.placeId),
    ["P1"],
  );
});

test("parsePlaces กับข้อมูลขยะคืนอาร์เรย์ว่าง ไม่ throw", () => {
  for (const junk of [null, undefined, "x", 1, {}, { local_results: "x" }, { error: "Invalid API key" }]) {
    assert.deepEqual(parsePlaces(junk), []);
  }
});

test("ไม่มี SERPAPI_KEY = ปิดฟีเจอร์ คืนผลว่างโดยไม่เรียกเครือข่าย", async () => {
  delete process.env.SERPAPI_KEY;
  assert.equal(placesEnabled(), false);
  assert.deepEqual(await searchPlaces("หาดใหญ่"), []);
});
