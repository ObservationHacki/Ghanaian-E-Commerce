import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'VBUY';
const DEFAULT_DESCRIPTION =
  'Shop verified electronics, fashion, home and beauty with nationwide delivery across Ghana. Pay with MTN MoMo or Telecel Cash.';
const DEFAULT_OG_IMAGE = '/og-default.svg';

type PageMetaProps = {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
};

export function PageMeta({
  title,
  description = DEFAULT_DESCRIPTION,
  path = '/',
  image = DEFAULT_OG_IMAGE,
  noIndex = false,
}: PageMetaProps) {
  const fullTitle = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} — Premium tech, fashion & home in Ghana`;
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://vbuy.gh';
  const url = `${origin}${path.startsWith('/') ? path : `/${path}`}`;
  const imageUrl = image.startsWith('http') ? image : `${origin}${image}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noIndex ? <meta name="robots" content="noindex, nofollow" /> : null}
      <link rel="canonical" href={url} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={imageUrl} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
    </Helmet>
  );
}
