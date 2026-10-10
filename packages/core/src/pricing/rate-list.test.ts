import { strict as assert } from "node:assert";
import { test } from "node:test";
import { formatRate, formatRateList, parseRateList } from "./rate-list.ts";

test("the shape an admin actually types", () => {
  // "Vaughan at five; Mississauga and Brampton at seven."
  const { rows, errors } = parseRateList("Vaughan -5, Mississauga, Brampton -7");
  assert.deepEqual(rows, [
    { destination: "Vaughan", price: 5 },
    { destination: "Mississauga", price: 7 },
    { destination: "Brampton", price: 7 },
  ]);
  assert.deepEqual(errors, []);
});

test("a name with no price of its own waits for the next one", () => {
  const { rows } = parseRateList("Ajax, Pickering, Whitby 8, Oshawa 9");
  assert.deepEqual(rows, [
    { destination: "Ajax", price: 8 },
    { destination: "Pickering", price: 8 },
    { destination: "Whitby", price: 8 },
    { destination: "Oshawa", price: 9 },
  ]);
});

test("every separator between a name and its price", () => {
  for (const line of ["Vaughan 5", "Vaughan-5", "Vaughan - 5", "Vaughan: 5", "Vaughan = 5", "Vaughan $5", "Vaughan — 5"]) {
    assert.deepEqual(parseRateList(line).rows, [{ destination: "Vaughan", price: 5 }], line);
  }
});

test("newlines and semicolons separate entries too", () => {
  const { rows } = parseRateList("Vaughan 5\nMississauga 7; Brampton 7");
  assert.deepEqual(rows, [
    { destination: "Vaughan", price: 5 },
    { destination: "Mississauga", price: 7 },
    { destination: "Brampton", price: 7 },
  ]);
});

test("cents survive", () => {
  assert.deepEqual(parseRateList("Vaughan 7.50").rows, [{ destination: "Vaughan", price: 7.5 }]);
  assert.deepEqual(parseRateList("Vaughan $12.25").rows, [{ destination: "Vaughan", price: 12.25 }]);
});

test("a city whose name has a dot or a hyphen in it survives", () => {
  assert.deepEqual(parseRateList("St. Catharines 12").rows, [{ destination: "St. Catharines", price: 12 }]);
  assert.deepEqual(parseRateList("Stouffville 9, Richmond Hill - 6").rows, [
    { destination: "Stouffville", price: 9 },
    { destination: "Richmond Hill", price: 6 },
  ]);
});

test("free delivery is a rate, not a missing one", () => {
  assert.deepEqual(parseRateList("Vaughan 0").rows, [{ destination: "Vaughan", price: 0 }]);
  assert.deepEqual(parseRateList("Vaughan 0").errors, []);
});

test("a name left without a price is an error, never a guess", () => {
  const { rows, errors } = parseRateList("Vaughan 5, Mississauga");
  assert.deepEqual(rows, [{ destination: "Vaughan", price: 5 }]);
  assert.equal(errors.length, 1);
  assert.match(errors[0]!, /Mississauga/);
});

test("a bare number on its own settles what came before it", () => {
  const { rows, errors } = parseRateList("Ajax, Whitby, 8");
  assert.deepEqual(rows, [
    { destination: "Ajax", price: 8 },
    { destination: "Whitby", price: 8 },
  ]);
  assert.deepEqual(errors, []);
});

test("the same destination twice keeps the later price and says so", () => {
  const { rows, errors } = parseRateList("Brampton 7, Brampton 9");
  assert.deepEqual(rows, [{ destination: "Brampton", price: 9 }]);
  assert.equal(errors.length, 1);
  assert.match(errors[0]!, /twice/);
});

test("a repeat in a different case is still a repeat", () => {
  const { rows } = parseRateList("Brampton 7, brampton 7");
  assert.equal(rows.length, 1);
});

test("a repeat at the same price is not worth complaining about", () => {
  assert.deepEqual(parseRateList("Brampton 7, Brampton 7").errors, []);
});

test("an absurd price is refused rather than published", () => {
  const { errors } = parseRateList("Vaughan 99999");
  assert.equal(errors.length, 1);
});

test("empty input is empty, not an error", () => {
  assert.deepEqual(parseRateList(""), { rows: [], errors: [] });
  assert.deepEqual(parseRateList("  ,, ;; \n "), { rows: [], errors: [] });
});

test("stray whitespace and trailing separators are ignored", () => {
  const { rows, errors } = parseRateList("  Vaughan  5 ,  Brampton  7 ,  ");
  assert.deepEqual(rows, [
    { destination: "Vaughan", price: 5 },
    { destination: "Brampton", price: 7 },
  ]);
  assert.deepEqual(errors, []);
});

test("what was parsed can be typed back in and parse the same", () => {
  const typed = "Vaughan -5, Mississauga, Brampton -7, St. Catharines 12.50";
  const once = parseRateList(typed).rows;
  const twice = parseRateList(formatRateList(once)).rows;
  assert.deepEqual(twice, once);
});

test("a whole number loses its decimals, a price with cents keeps them", () => {
  assert.equal(formatRate(5), "5");
  assert.equal(formatRate(7.5), "7.50");
  assert.equal(formatRateList([{ destination: "Vaughan", price: 5 }]), "Vaughan 5");
});
