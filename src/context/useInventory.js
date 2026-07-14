import { useContext } from "react";
import { InventoryContext } from "./InventoryContext";

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be inside InventoryProvider");
  return ctx;
}
