const cartItemSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: "Products", required: true },
  product_type: { type: String, enum: ["music", "merch"], required: true },
  variant: {
    size: { type: String, default: null },
    color: { type: String, default: null },
  },
  quantity: { type: Number, min: 1, default: 1 },
  price_at_added: { type: Number, required: true },
});

const cartSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    items: [cartItemSchema],
    total_price: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "checked_out", "abandoned"], default: "active" },
  },
  { timestamps: true }
);

export default mongoose.model("Cart", cartSchema);