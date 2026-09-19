import { describe, it, expect } from "vitest";
import { Vec2, add, fromAngle, scale, vec } from "../../src/core/vec";
import { ellipseFromFoci, lineThrough } from "../../src/core/conic";
import { rayConic } from "../../src/core/intersect";
import { Piece, onPiece, rayPiece, whole } from "../../src/core/piece";

// Okrąg NIE w środku układu: implementacja licząca stronę cięciwy względem (0,0)
// zamiast względem `from` przeszłaby na okręgu wokół zera.
const C = vec(0.3, 0.2);
const R = 0.5;
const circle = ellipseFromFoci(C, C, R);
const at = (deg: number): Vec2 => add(C, scale(fromAngle((deg * Math.PI) / 180), R));

/** Górna połowa: od 0° przez 90° do 180°. */
const upper: Piece = { conic: circle, arc: { from: at(0), via: at(90), to: at(180) } };
/** Łuk WIĘKSZY niż pół okręgu: cięciwa nad środkiem, `via` na dole — zachowane 240°. */
const big: Piece = { conic: circle, arc: { from: at(150), via: at(270), to: at(30) } };

const wall: Piece = {
  conic: lineThrough(vec(0.25, 0.5), vec(1, 0)),
  arc: { from: vec(0.25, 0.5), via: vec(0.5, 0.5), to: vec(0.75, 0.5) },
};

describe("przynależność do łuku", () => {
  it("punkt po stronie `via` należy, po drugiej stronie cięciwy nie", () => {
    expect(onPiece(upper, at(45))).toBe(true);
    expect(onPiece(upper, at(135))).toBe(true);
    expect(onPiece(upper, at(270))).toBe(false);
    expect(onPiece(upper, at(200))).toBe(false);
  });

  it("łuk większy niż pół: `via` po dużej stronie, znak nie jest zakodowany na sztywno", () => {
    expect(onPiece(big, at(270))).toBe(true);
    expect(onPiece(big, at(0))).toBe(true);     // pod cięciwą, ale po stronie `via`
    expect(onPiece(big, at(180))).toBe(true);
    expect(onPiece(big, at(90))).toBe(false);   // jedyny wycięty kawałek to górne 120°
  });

  it("końce łuku liczą się włącznie", () => {
    // p − from jest DOKŁADNIE zerem, a cross(chord, chord) też — test ostry `> 0` odpada
    expect(onPiece(upper, upper.arc!.from)).toBe(true);
    expect(onPiece(upper, upper.arc!.to)).toBe(true);
    expect(onPiece(big, big.arc!.from)).toBe(true);
    expect(onPiece(big, big.arc!.to)).toBe(true);
  });

  it("odcinek: końce włącznie, tuż za końcami już nie", () => {
    // wartości dokładnie reprezentowalne: 0.25, 0.5, 0.75 to sumy potęg dwójki
    expect(onPiece(wall, vec(0.5, 0.5))).toBe(true);
    expect(onPiece(wall, vec(0.25, 0.5))).toBe(true);
    expect(onPiece(wall, vec(0.75, 0.5))).toBe(true);
    expect(onPiece(wall, vec(0.8125, 0.5))).toBe(false);
    expect(onPiece(wall, vec(0.1875, 0.5))).toBe(false);
  });

  it("brak łuku = cała krzywa", () => {
    expect(onPiece(whole(circle), at(270))).toBe(true);
  });
});

describe("półprosta a kawałek krzywej", () => {
  it("bliższe trafienie w przerwie łuku → piłka leci do dalszego", () => {
    // pionowo w górę przez środek: najpierw dół okręgu (przerwa), potem góra (łuk)
    const p = vec(0.3, -0.5), d = vec(0, 1);
    expect(rayConic(p, d, circle)).toBeCloseTo(0.2, 12);
    expect(rayPiece(p, d, upper)).toBeCloseTo(1.2, 12);
  });

  it("oba trafienia w przerwie → brak trafienia", () => {
    // poziomo pod środkiem okręgu: oba przecięcia leżą w dolnej, wyciętej połowie
    expect(rayConic(vec(-1, 0), vec(1, 0), circle)).not.toBeNull();
    expect(rayPiece(vec(-1, 0), vec(1, 0), upper)).toBeNull();
  });

  it("trafienie tuż za końcem odcinka nie jest trafieniem, a w sam koniec jest", () => {
    expect(rayPiece(vec(0.8125, 0), vec(0, 1), wall)).toBeNull();
    expect(rayPiece(vec(0.75, 0), vec(0, 1), wall)).toBe(0.5);
  });

  it("cała krzywa: rayPiece to dokładnie rayConic", () => {
    const k = ellipseFromFoci(vec(-0.2, 0.1), vec(0.5, 0.3), 0.6);
    for (let i = 0; i < 16; i++) {
      const d = fromAngle(i * 0.4 + 0.1);
      expect(rayPiece(vec(0.1, 0.2), d, whole(k))).toBe(rayConic(vec(0.1, 0.2), d, k));
    }
  });
});
