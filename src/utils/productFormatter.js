
export const formatArtist = (artist) => {
    if (!artist) return null;

    return {
        _id: artist._id,
        username: artist.username,
        name: artist.display_name || artist.username,
        display_name: artist.display_name,
        profile_picture: artist.profile_picture,
        profile_picture_url: artist.profile_picture?.url ?? null,
        bio: artist.bio,
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

    return {
      _id: product._id,
      artist_id: product.artist?._id ?? product.artist,
      artist: formatArtist(product.artist),
      type: product.type,
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
      tracks: product.tracks?.map(formatTrack).filter(Boolean) ?? [],
      created_at: product.createdAt,
      updated_at: product.updatedAt,
    };
  };
