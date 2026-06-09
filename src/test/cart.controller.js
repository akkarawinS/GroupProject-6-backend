//READ
export const getCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user_id: req.params.userId })
      .populate("items.product_id", "name price image");

    if (!cart) {
      return res.json({ success: true, data: { items: [], total_price: 0 } });
    }

    res.json({ success: true, data: cart });
  } catch (err) {
    next(err);
  }
};


//CREATE
export const addToCart = async (req, res, next) => {
  try {
    const { user_id, product_id, product_type, quantity, price_at_added, variant } = req.body;

    // หาตะกร้าของ user ถ้าไม่มีสร้างใหม่
    let cart = await Cart.findOne({ user_id });
    if (!cart) {
      cart = await Cart.create({ user_id, items: [], total_price: 0 });
    }

    // เช็คว่ามีสินค้านี้ในตะกร้าแล้วไหม
    const existItem = cart.items.find(
      (item) => item.product_id.toString() === product_id
    );

    if (existItem) {
      // มีแล้ว เพิ่มจำนวน
      existItem.quantity += quantity || 1;
    } else {
      // ยังไม่มี เพิ่มใหม่
      cart.items.push({ product_id, product_type, quantity, price_at_added, variant });
    }

    // คำนวณราคารวม
    cart.total_price = cart.items.reduce(
      (sum, item) => sum + item.price_at_added * item.quantity, 0
    );

    await cart.save();
    res.status(201).json({ success: true, data: cart });
  } catch (err) {
    next(err);
  }
};
//UPDATE
export const updateCartItem = async (req, res, next) => {
  try {
    const { userId, itemId } = req.params;
    const { quantity } = req.body;

    const cart = await Cart.findOne({ user_id: userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    // หา item ที่ต้องการแก้
    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    item.quantity = quantity;

    // คำนวณราคารวมใหม่
    cart.total_price = cart.items.reduce(
      (sum, item) => sum + item.price_at_added * item.quantity, 0
    );

    await cart.save();
    res.json({ success: true, data: cart });
  } catch (err) {
    next(err);
  }
};
//DELETE
export const removeCartItem = async (req, res, next) => {
  try {
    const { userId, itemId } = req.params;

    const cart = await Cart.findOne({ user_id: userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    // กรองเอาชิ้นที่ไม่ต้องการออก
    cart.items = cart.items.filter(
      (item) => item._id.toString() !== itemId
    );

    // คำนวณราคารวมใหม่
    cart.total_price = cart.items.reduce(
      (sum, item) => sum + item.price_at_added * item.quantity, 0
    );

    await cart.save();
    res.json({ success: true, data: cart });
  } catch (err) {
    next(err);
  }
};


//DELETE - ล้างตะกร้าทั้งหมด
export const clearCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user_id: req.params.userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    cart.items = [];
    cart.total_price = 0;
    cart.status = "checked_out";

    await cart.save();
    res.json({ success: true, message: "Cart cleared" });
  } catch (err) {
    next(err);
  }
};