import { describe, expect, it } from "vitest";
import { normalizeUppercaseFields, toUppercaseText } from "../uppercase";

describe("uppercase normalization", () => {
  it("converts text values to uppercase without changing non-string values", () => {
    expect(toUppercaseText("Batería ñandú")).toBe("BATERÍA ÑANDÚ");
    expect(toUppercaseText(123)).toBe(123);
    expect(toUppercaseText(null)).toBeNull();
  });

  it("normalizes only configured business fields", () => {
    const result = normalizeUppercaseFields("Productos", {
      codigo: "ab-01",
      descripcion: "Filtro de aceite",
      stock: 5,
      imagenUrl: "https://cdn.example.com/ImageAbC.jpg",
    });

    expect(result).toEqual({
      codigo: "AB-01",
      descripcion: "FILTRO DE ACEITE",
      stock: 5,
      imagenUrl: "https://cdn.example.com/ImageAbC.jpg",
    });
  });

  it("preserves technical values while normalizing free text", () => {
    const movement = normalizeUppercaseFields("movimientos", {
      tipo: "entrada",
      motivo: "Compra inicial",
    });
    const transfer = normalizeUppercaseFields("traslados", {
      estado: "pendiente",
      notas: "Enviar mañana",
      items: '[{"productoId":1}]',
    });

    expect(movement).toEqual({ tipo: "entrada", motivo: "COMPRA INICIAL" });
    expect(transfer).toEqual({
      estado: "pendiente",
      notas: "ENVIAR MAÑANA",
      items: '[{"productoId":1}]',
    });
  });
});
