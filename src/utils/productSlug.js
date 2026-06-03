import { Product } from "../models/product.model.js";

export const slugify = (value) => {
    return String(value)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'product';
};

export const createUniqueProductSlug = async (title) => {
    const baseSlug = slugify(title);
    let slug = baseSlug;
    let counter = 2;

    while (await Product.exists({ slug })) {
        slug = `${baseSlug}-${counter}`;
        counter += 1;
    }

    return slug;
};
