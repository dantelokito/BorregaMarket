import { HeaderWrapper } from "@/components/layout/HeaderWrapper";
import { CartPageClient } from "./CartPageClient";

export default function CartPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderWrapper />
      <CartPageClient />
    </div>
  );
}
