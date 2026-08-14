import { HeaderWrapper } from "@/components/layout/HeaderWrapper";
import { SubNavProveedor } from "@/components/provider/SubNavProveedor";

export default function ProveedorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderWrapper />
      <SubNavProveedor />
      {children}
    </div>
  );
}
