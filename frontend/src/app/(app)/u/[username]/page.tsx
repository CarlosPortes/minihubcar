import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CollectorProfileClient } from './CollectorProfileClient';
import { PublicCollectorProfile } from '@/lib/api/users';

interface PageProps {
  params: Promise<{ username: string }>;
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

async function getCollectorProfile(identifier: string): Promise<PublicCollectorProfile | null> {
  try {
    const backendUrl = getBackendUrl();
    const res = await fetch(`${backendUrl}/api/v1/users/public/${encodeURIComponent(identifier)}`, {
      next: { revalidate: 600 }, // Cache por 10 minutos
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      console.warn(`Collector profile ${identifier} not found: ${res.status}`);
      return null;
    }

    const json = await res.json();
    return json.data;
  } catch (error) {
    console.error(`Error fetching public profile ${identifier}:`, error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await getCollectorProfile(username);

  if (!profile) {
    return {
      title: 'Colecionador não encontrado | MiniHub Car',
      description: 'O perfil de colecionador procurado não foi encontrado no MiniHub Car.',
    };
  }

  const handle = profile.username ? ` (@${profile.username})` : '';
  const cityText = profile.city ? ` de ${profile.city}` : '';
  const title = `Garagem de ${profile.name}${handle} - Coleção Diecast | MiniHub Car`;
  const description = `Conheça a coleção de miniaturas de ${profile.name}${cityText}. São ${profile.stats.totalMiniatures} modelos cadastrados, ${profile.stats.totalBrands} fabricantes e ${profile.stats.raresCount} relíquias no MiniHub Car.`;
  const canonicalUrl = `https://minihubcar.com.br/u/${profile.username || profile.id}`;

  const imageUrl = profile.avatarUrl
    ? profile.avatarUrl.startsWith('http')
      ? profile.avatarUrl
      : `https://minihubcar.com.br${profile.avatarUrl}`
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
          alt: profile.name,
        },
      ],
      type: 'profile',
      locale: 'pt_BR',
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: [imageUrl],
    },
    keywords: [
      profile.name,
      profile.username || '',
      'colecionador diecast',
      'garagem hot wheels',
      'coleção de miniaturas',
      'minihub car',
    ].filter(Boolean),
  };
}

export default async function CollectorPublicProfilePage({ params }: PageProps) {
  const { username } = await params;
  const profile = await getCollectorProfile(username);

  if (!profile) {
    notFound();
  }

  // Schema.org ProfilePage structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: profile.name,
      alternateName: profile.username ? `@${profile.username}` : undefined,
      description: profile.bio || `Colecionador de miniaturas diecast no MiniHub Car.`,
      image: profile.avatarUrl || undefined,
      url: `https://minihubcar.com.br/u/${profile.username || profile.id}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CollectorProfileClient initialProfile={profile} />
    </>
  );
}
