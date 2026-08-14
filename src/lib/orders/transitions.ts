import { OrderStatus, UserRole } from "@prisma/client";

const PROVIDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.IN_TRANSIT, OrderStatus.CANCELLED],
  [OrderStatus.IN_TRANSIT]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

export function allowedTransitions(from: OrderStatus): readonly OrderStatus[] {
  return PROVIDER_TRANSITIONS[from];
}

export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  role: UserRole
): boolean {
  if (role === UserRole.CLIENT) {
    return from === OrderStatus.PENDING && to === OrderStatus.CANCELLED;
  }
  if (role === UserRole.PROVIDER || role === UserRole.ADMIN) {
    return PROVIDER_TRANSITIONS[from].includes(to);
  }
  return false;
}
