import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MiniatureDetailPageClient } from './MiniatureDetailPageClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

function getBackendUrl(): string {
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL;
  }
  if (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.startsWith('http')) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, '');
  }
  return 'http://localhost:3333';
}

async function getVariation(id: string) {
  try {
    const backendUrl = getBackendUrl();
    const res = await fetch(`${backendUrl}/api/v1/catalog/variations/${id}`, {
      next: { revalidate: 3600 }, // Cache por 1 hora
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      console.warn(`Failed to fetch variation ${id} on server: status ${res.status}`);
      return null;
    }

    const json = await res.json();
    return json.data;
  } catch (error) {
    console.error(`Error fetching variation ${id} for SSR:`, error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const variation = await getVariation(id);

  if (!variation) {
    return {
      title: 'Miniatura não encontrada | MiniHub Car',
      description: 'A miniatura procurada não foi encontrada no catálogo MiniHub Car.',
    };
  }

  const brandName = variation.brand?.name || 'Diecast';
  const yearText = variation.releaseYear ? ` (${variation.releaseYear})` : '';
  const scaleText = variation.scale?.name ? ` ${variation.scale.name}` : ' 1:64';
  const colorText = variation.color ? `, cor ${variation.color}` : '';
  const seriesText = variation.series?.name ? ` Série ${variation.series.name}.` : '';

  const title = `${variation.name}${yearText} - ${brandName}${scaleText} | MiniHub Car`;
  const description = `Confira ${variation.name} da ${brandName} em escala${scaleText}${colorText}.${seriesText} Fotos em alta resolução, ficha técnica, códigos de colecionador e anúncios de compra e troca no MiniHub Car.`;
  const canonicalUrl = `https://minihubcar.com.br/catalog/${variation.id}`;

  const imageUrl = variation.photoUrl
    ? variation.photoUrl.startsWith('http')
      ? variation.photoUrl
      : `https://minihubcar.com.br${variation.photoUrl}`
    : 'https://minihubcar.com.br/og-image.png';

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'MiniHub Car',
      images: [
        {
          url: imageUrl,
          width: 800,
          height: 600,
          alt: variation.name,
        },
      ],
      type: 'article',
      locale: 'pt_BR',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
    keywords: [
      variation.name,
      brandName,
      'diecast',
      'miniatura',
      variation.casting?.name || '',
      variation.series?.name || '',
      'colecionador',
      'mini hub car',
    ].filter(Boolean),
  };
}

export default async function MiniatureDetailPage({ params }: PageProps) {
  const { id } = await params;
  const variation = await getVariation(id);

  if (!variation) {
    notFound();
  }

  // Schema.org Product structured data for rich SEO snippet
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: variation.name,
    image: variation.photoUrl ? [variation.photoUrl] : [],
    description:
      variation.description ||
      `${variation.name} - Miniatura colecionável ${variation.brand?.name || ''} escala ${variation.scale?.name || '1:64'}.`,
    brand: {
      '@type': 'Brand',
      name: variation.brand?.name || 'Diecast',
    },
    category: 'Miniaturas e Colecionáveis',
    productionDate: variation.releaseYear ? `${variation.releaseYear}` : undefined,
    color: variation.color || undefined,
    identifier: variation.identifiers?.[0]?.code || undefined,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'BRL',
      availability: 'https://schema.org/InStock',
      url: `https://minihubcar.com.br/catalog/${variation.id}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MiniatureDetailPageClient initialData={variation} />
    </>
  );
}
