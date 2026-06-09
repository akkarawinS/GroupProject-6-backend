import { buildPreviewUrl } from './cloudinaryUpload.js';

const slugifyText = (value) => {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

const formatGenreSlug = (genre) => slugifyText(genre);

export const formatArtist = (artist) => {
    if (!artist) return null;

    const genreSlug = formatGenreSlug(artist.genre);

    return {
        _id: artist._id,
        username: artist.username,
        slug: slugifyText(artist.username || artist.display_name || artist._id),
        name: artist.display_name || artist.username,
        display_name: artist.display_name,
        profile_picture: artist.profile_picture,
        profile_picture_url: artist.profile_picture?.url ?? null,
        banner_picture: artist.banner_picture,
        banner_picture_url: artist.banner_picture?.url ?? null,
        bio: artist.bio,
        genre: artist.genre,
        genre_slug: genreSlug || null,
        genre_ids: genreSlug ? [genreSlug] : [],
        role: artist.role,
    };
};

export const formatTrack = (track) => {
    if (!track) return null;

    return {
        _id: track._id,
        artist_id: track.artist,
        title: track.title,
        duration_sec: track.durationSec,
        audio_file_url: track.audioUrl?.url ?? null,
        preview_url: track.audioUrl?.public_id
            ? buildPreviewUrl(
                track.audioUrl.public_id,
                track.previewStartSec,
                track.previewDurationSec,
            )
            : null,
        audio_url: track.audioUrl,
        preview_start_sec: track.previewStartSec,
        preview_duration_sec: track.previewDurationSec,
        is_streamable: track.isStreamable,
        created_at: track.createdAt,
        updated_at: track.updatedAt,
    };
};

export const formatProduct = (product) => {
    if (!product) return null;

    const tracks = product.tracks?.map(formatTrack).filter(Boolean) ?? [];
    const detail = formatProductDetail(product, tracks);

    return {
        _id: product._id,
        artist_id: product.artist?._id ?? product.artist,
        artist: formatArtist(product.artist),
        type: product.type,
        merch_type: product.merchType,
        merchType: product.merchType,
        title: product.title,
        slug: product.slug,
        description: product.description,
        price: product.price,
        min_price: product.minPrice,
        stock: product.stock,
        cover_url: product.coverUrl?.url ?? null,
        cover: product.coverUrl,
        name_your_price: product.nameYourPrice,
        status: product.status,
        release_date: product.releaseDate,
        deleted_at: product.deletedAt,
        tracks,
        detail,
        created_at: product.createdAt,
        updated_at: product.updatedAt,
    };
};


export const formatPublicTrack = (track) => {
    if (!track) return null;

    return {
      _id: track._id,
      artist_id: track.artist,
      title: track.title,
      duration_sec: track.durationSec,
      preview_url: track.audioUrl?.public_id
        ? buildPreviewUrl(
            track.audioUrl.public_id,
            track.previewStartSec,
            track.previewDurationSec,
          )
        : null,
      preview_start_sec: track.previewStartSec,
      preview_duration_sec: track.previewDurationSec,
      is_streamable: track.isStreamable,
    };
  };

  export const formatPublicProduct = (product) => {
    if (!product) return null;

    const tracks = product.tracks?.map(formatPublicTrack).filter(Boolean) ?? [];
    const detail = formatProductDetail(product, tracks);

    return {
      _id: product._id,
      artist_id: product.artist?._id ?? product.artist,
      artist: formatArtist(product.artist),
      type: product.type,
      merch_type: product.merchType,
      merchType: product.merchType,
      title: product.title,
      slug: product.slug,
      description: product.description,
      price: product.price,
      min_price: product.minPrice,
      stock: product.stock,
      cover_url: product.coverUrl?.url ?? null,
      name_your_price: product.nameYourPrice,
      status: product.status,
      release_date: product.releaseDate,
      tracks,
      detail,
      created_at: product.createdAt,
    };
  };


  export const formatOwnedTrack = (track) => {
    if (!track) return null;

    return {
      _id: track._id,
      artist_id: track.artist,
      title: track.title,
      duration_sec: track.durationSec,
      audio_file_url: track.audioUrl?.url ?? null,
      preview_url: track.audioUrl?.public_id
        ? buildPreviewUrl(
            track.audioUrl.public_id,
            track.previewStartSec,
            track.previewDurationSec,
          )
        : null,
    };
  };


  export const formatOwnedProduct = (product) => {
    if (!product) return null;

    const tracks = product.tracks?.map(formatOwnedTrack).filter(Boolean) ?? [];
    const detail = formatProductDetail(product, tracks);

    return {
      _id: product._id,
      artist_id: product.artist?._id ?? product.artist,
      artist: formatArtist(product.artist),
      type: product.type,
      merch_type: product.merchType,
      merchType: product.merchType,
      title: product.title,
      slug: product.slug,
      description: product.description,
      price: product.price,
      min_price: product.minPrice,
      stock: product.stock,
      cover_url: product.coverUrl?.url ?? null,
      cover: product.coverUrl,
      name_your_price: product.nameYourPrice,
      status: product.status,
      release_date: product.releaseDate,
      tracks,
      detail,
      purchased_at: product.purchasedAt,
      created_at: product.createdAt,
    };
  };

const formatMerchVariant = (variant, index) => ({
    variant_id: variant.variantId || variant.sku || `variant-${index + 1}`,
    size: variant.size || "",
    color: variant.color || "",
    stock_quantity: variant.stockQuantity ?? 0,
    sku: variant.sku || "",
});

const formatProductDetail = (product, tracks) => {
    if (product.type === 'single') {
        return tracks[0] ?? null;
    }

    if (product.type === 'album') {
        return {
            product_id: product._id,
            tracks,
            track_ids: tracks.map((track) => track._id),
        };
    }

    if (product.type === 'merch') {
        const variants = product.merchVariants?.length
            ? product.merchVariants.map(formatMerchVariant)
            : [
                {
                    variant_id: 'default',
                    size: '',
                    color: '',
                    stock_quantity: product.stock ?? 999999,
                    sku: '',
                },
            ];

        return {
            product_id: product._id,
            merch_type: product.merchType,
            weight_grams: product.weightGrams,
            ships_internationally: product.shipsInternationally,
            variants,
        };
    }

    return null;
};
