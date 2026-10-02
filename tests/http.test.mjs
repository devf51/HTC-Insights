import { test } from "node:test";
import assert from "node:assert/strict";
import { crossSiteError } from "../lib/http.ts";

const req = (headers) => new Request("http://htc.example/api/x", { method: "POST", headers: { host: "htc.example", ...headers } });

test("crossSiteError: ต้นทางเดียวกันผ่าน", () => {
  assert.equal(crossSiteError(req({ origin: "http://htc.example", "sec-fetch-site": "same-origin" })), null);
});

test("crossSiteError: ไม่มี Origin/Sec-Fetch-Site (ไม่ใช่เบราว์เซอร์) ผ่าน", () => {
  assert.equal(crossSiteError(req({})), null);
});

test("crossSiteError: หลัง reverse proxy เทียบกับ X-Forwarded-Host", () => {
  assert.equal(crossSiteError(req({ host: "127.0.0.1:3000", "x-forwarded-host": "htc.example", origin: "https://htc.example" })), null);
});

test("crossSiteError: เว็บอื่น subdomain อื่น และ Origin: null ถูกปฏิเสธ 403", () => {
  for (const h of [
    { origin: "https://evil.example", "sec-fetch-site": "cross-site" },
    { origin: "https://evil.example" },
    { "sec-fetch-site": "same-site", origin: "https://sub.htc.example" },
    { origin: "null" },
  ]) {
    assert.equal(crossSiteError(req(h))?.status, 403, JSON.stringify(h));
  }
});
