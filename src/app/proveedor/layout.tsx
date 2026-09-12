import { HeaderWrapper } from "@/components/layout/HeaderWrapper";
import { SubNavProveedor } from "@/components/provider/SubNavProveedor";
import { ProviderPanelBody } from "@/components/provider/ProviderPanelBody";

export default function ProveedorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderWrapper />
      <SubNavProveedor />
      <ProviderPanelBody>{children}</ProviderPanelBody>
    </div>
  );
}
