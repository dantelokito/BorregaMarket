import { LegalDocumentType, PrismaClient } from "@prisma/client";

/**
 * F15 (ADR-042): v1 de PRIVACY, TERMS y COOKIES. Idempotente: solo crea la v1
 * de un `type` que no tenga ninguna versión. No depende de demo-guard.
 * Los marcadores {{...}} se sustituyen en servidor desde LegalSettings.
 */

const DRAFT_NOTICE = "**BORRADOR — sujeto a revisión legal.**";

const PRIVACY_CONTENT = `${DRAFT_NOTICE}

## Identidad y domicilio del responsable

{{RESPONSABLE_NOMBRE}}, con domicilio en {{RESPONSABLE_DOMICILIO}}, es responsable del tratamiento de los datos personales que se recaban a través de LaBorregaMarket, conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.

## Datos personales que recabamos

- Identificación y contacto: nombre, correo electrónico y teléfono.
- Ubicación aproximada y direcciones de entrega que el usuario captura o autoriza desde su navegador.
- Datos del negocio de las fruterías: nombre comercial, domicilio, teléfono y horarios.
- Dirección IP en la bitácora de seguridad y en el control de intentos de acceso.

No recabamos datos patrimoniales, financieros ni datos personales sensibles.

## Finalidades

Finalidades primarias (necesarias para el servicio):

- Crear y administrar tu cuenta.
- Mostrar fruterías cercanas y gestionar pedidos entre clientes y fruterías.
- Enviar avisos de pedidos por correo y, si lo autorizas, por WhatsApp.
- Prevenir fraudes y abusos y mantener la seguridad de la plataforma.

Finalidades secundarias:

- Medir de forma agregada y sin datos personales el uso del sitio para mejorarlo.

Si no deseas que tus datos se traten para las finalidades secundarias, puedes desactivar la medición desde "Preferencias de medición" en el pie de página o escribir a {{CORREO_ARCO}}.

## Transferencias y remisiones

No vendemos tus datos. Compartimos los estrictamente necesarios con encargados que prestan servicios a la plataforma: proveedor de base de datos y hospedaje (Neon / hosting), Upstash (caché y control de intentos), Resend (correo), Inngest (tareas en segundo plano), Meta WhatsApp Business (avisos), OpenStreetMap / Nominatim (mapas y búsqueda de direcciones), Cloudinary (imágenes) y Umami (medición sin cookies). Al hacer un pedido, la frutería recibe los datos necesarios para atenderlo.

## Derechos ARCO y revocación

Puedes ejercer tus derechos de acceso, rectificación, cancelación y oposición, o revocar tu consentimiento, escribiendo a {{CORREO_ARCO}} o llamando al {{TELEFONO}}. Responderemos en el plazo que establece la ley.

## Conservación

La dirección IP de la bitácora se conserva hasta 12 meses y después se anonimiza. La IP del control de intentos de acceso solo se guarda durante la ventana de ese control (de 15 minutos a 1 hora).

## Cambios al aviso

Publicaremos cualquier cambio en esta página con su número de versión y fecha de vigencia. Si el cambio requiere tu aceptación, te la pediremos al iniciar sesión.
`;

const TERMS_CONTENT = `${DRAFT_NOTICE}

## Responsable

LaBorregaMarket es operado por {{RESPONSABLE_NOMBRE}}, con domicilio en {{RESPONSABLE_DOMICILIO}}, teléfono {{TELEFONO}} y correo {{CORREO_ARCO}}.

## Uso de la plataforma

- El uso de la plataforma es exclusivo para personas mayores de 18 años o que cuenten con autorización de su madre, padre o tutor.
- Al crear una cuenta declaras que la información que proporcionas es verídica.

## Papel de LaBorregaMarket

LaBorregaMarket es un intermediario que conecta a clientes con fruterías. LaBorregaMarket no vende productos.

## Responsabilidad de la frutería

Cada frutería fija el precio, la calidad, el peso y las condiciones de higiene de los productos perecederos que ofrece y responde por ellos frente al cliente.

## Precios

Los precios mostrados son totales e incluyen los impuestos aplicables según los publique cada frutería.

## Aceptación electrónica

Tu aceptación de estos Términos y del Aviso de Privacidad queda registrada electrónicamente con la versión del documento y la fecha y hora en que la otorgaste.

## Cambios

Publicaremos cualquier cambio en esta página con su número de versión y fecha de vigencia.
`;

const COOKIES_CONTENT = `${DRAFT_NOTICE}

## Cookies estrictamente necesarias

- \`lbm_token\`: mantiene tu sesión iniciada.
- \`lbm_active_provider\`: recuerda la sucursal activa de un proveedor.

Estas cookies son indispensables para que el sitio funcione y no se usan para publicidad.

## Almacenamiento local

Usamos el almacenamiento local del navegador (\`localStorage\`) para guardar preferencias, como tu carrito y tu elección sobre la medición.

## Medición

Usamos Umami para medir de forma agregada las visitas. Umami no usa cookies ni recaba datos personales. Puedes desactivar la medición desde "Preferencias de medición" en el pie de página. Si tu navegador envía la señal "No rastrear", no se carga la medición.

## Cómo borrar el almacenamiento

Puedes borrar las cookies y el almacenamiento local desde la configuración de privacidad de tu navegador. Si borras \`lbm_token\`, se cerrará tu sesión.

## Contacto

Para cualquier duda escribe a {{CORREO_ARCO}}.
`;

export const LEGAL_SEED_DOCUMENTS: ReadonlyArray<{
  type: LegalDocumentType;
  title: string;
  content: string;
}> = [
  { type: LegalDocumentType.PRIVACY, title: "Aviso de Privacidad", content: PRIVACY_CONTENT },
  { type: LegalDocumentType.TERMS, title: "Términos y Condiciones", content: TERMS_CONTENT },
  { type: LegalDocumentType.COOKIES, title: "Política de Cookies", content: COOKIES_CONTENT },
];

export async function seedLegal(prisma: PrismaClient): Promise<LegalDocumentType[]> {
  await prisma.legalSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  const created: LegalDocumentType[] = [];
  for (const doc of LEGAL_SEED_DOCUMENTS) {
    const existing = await prisma.legalDocument.count({ where: { type: doc.type } });
    if (existing > 0) continue;
    await prisma.legalDocument.create({
      data: {
        type: doc.type,
        version: 1,
        title: doc.title,
        content: doc.content,
        effectiveAt: new Date(),
      },
    });
    created.push(doc.type);
  }
  return created;
}

const invokedDirectly = /seed-legal\.ts$/.test(process.argv[1] ?? "");

if (invokedDirectly) {
  const prisma = new PrismaClient();
  seedLegal(prisma)
    .then((created) => {
      console.log(
        created.length > 0
          ? `✅ Documentos legales v1 creados: ${created.join(", ")}`
          : "✅ Documentos legales ya existían; sin cambios"
      );
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
