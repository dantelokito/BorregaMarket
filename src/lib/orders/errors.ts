import type { FieldError } from "@/lib/api/response";

export class ProductUnavailableError extends Error {
  constructor(message = "Producto no disponible") {
    super(message);
    this.name = "ProductUnavailableError";
  }
}

export class InvalidTransitionError extends Error {
  constructor(message = "Transición de estado no permitida") {
    super(message);
    this.name = "InvalidTransitionError";
  }
}

export class OrderNotFoundError extends Error {
  constructor(message = "Pedido no encontrado") {
    super(message);
    this.name = "OrderNotFoundError";
  }
}

export class OrderForbiddenError extends Error {
  constructor(message = "Acceso denegado") {
    super(message);
    this.name = "OrderForbiddenError";
  }
}

export class OrderValidationError extends Error {
  details?: FieldError[];

  constructor(message: string, details?: FieldError[]) {
    super(message);
    this.name = "OrderValidationError";
    this.details = details;
  }
}
