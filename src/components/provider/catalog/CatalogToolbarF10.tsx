"use client";

import { Button } from "@/components/ui/Button";

export function CatalogToolbarF10({
  onAddProduct,
  onNewSection,
  addDisabled,
}: {
  onAddProduct: () => void;
  onNewSection: () => void;
  addDisabled?: boolean;
}) {
  return (
    <div className="mb-6 flex flex-col gap-2 sm:flex-row">
      <Button
        type="button"
        onClick={onAddProduct}
        disabled={addDisabled}
        className="min-h-11 w-full sm:w-auto"
      >
        Agregar producto
      </Button>
      <Button
        type="button"
        variant="secondary"
        onClick={onNewSection}
        className="min-h-11 w-full sm:w-auto"
      >
        Nueva sección
      </Button>
    </div>
  );
}
