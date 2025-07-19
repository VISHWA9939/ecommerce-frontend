import { create } from "zustand";
import axios from "../lib/axios";
import { toast } from "react-hot-toast";

export const useCartStore = create((set, get) => ({
    cart: [],
    coupon: null,
    total: 0,
    subtotal: 0,
    isCouponApplied: false,
    loading: false,

    getMyCoupon: async () => {
        try {
            const response = await axios.get("/coupons");
            // Only set coupon if it exists and is not expired
            if (response.data && new Date(response.data.expirationDate) > new Date()) {
                set({ 
                    coupon: response.data,
                    isCouponApplied: true
                });
                get().calculateTotals();
            }
        } catch (error) {
            console.error("Error fetching coupon:", error);
            set({ coupon: null, isCouponApplied: false });
        }
    },

    applyCoupon: async (code) => {
        if (!code) {
            toast.error("Please enter a coupon code");
            return;
        }

        set({ loading: true });
        try {
            console.log('Applying coupon:', code.trim());
            const response = await axios.post("/coupons/validate", { code: code.trim() });
            console.log('Coupon response:', response.data);
            
            if (!response.data) {
                toast.error("Invalid coupon code");
                set({ coupon: null, isCouponApplied: false, loading: false });
                return;
            }

            // Check if coupon is expired
            if (new Date(response.data.expirationDate) <= new Date()) {
                toast.error("This coupon has expired");
                set({ coupon: null, isCouponApplied: false, loading: false });
                return;
            }

            set({ 
                coupon: response.data, 
                isCouponApplied: true,
                loading: false 
            });
            get().calculateTotals();
            toast.success(`Coupon applied! ${response.data.discountPercentage}% off`);
        } catch (error) {
            console.error("Coupon error:", error);
            if (error.response?.status === 401) {
                toast.error("Please log in to apply a coupon");
            } else {
                toast.error(error.response?.data?.message || "Failed to apply coupon");
            }
            set({ coupon: null, isCouponApplied: false, loading: false });
            get().calculateTotals();
        } finally {
            set({ loading: false });
        }
    },

    removeCoupon: () => {
        set({ 
            coupon: null, 
            isCouponApplied: false 
        });
        get().calculateTotals();
        toast.success("Coupon removed");
    },

    getCartItems: async () => {
        try {
            const res = await axios.get("/cart");
            set({ cart: res.data });
            get().calculateTotals();
        } catch (error) {
            set({ cart: [] });
            toast.error(error.response?.data?.message || "Failed to fetch cart items");
        }
    },

    clearCart: async () => {
        set({ 
            cart: [], 
            coupon: null, 
            isCouponApplied: false,
            total: 0, 
            subtotal: 0 
        });
    },

    addToCart: async (product) => {
        if (!product?._id) {
            toast.error("Invalid product");
            return;
        }

        try {
            await axios.post("/cart", { productId: product._id });
            
            set((prevState) => {
                const existingItem = prevState.cart.find((item) => item._id === product._id);
                const newCart = existingItem
                    ? prevState.cart.map((item) =>
                            item._id === product._id 
                                ? { ...item, quantity: item.quantity + 1 } 
                                : item
                      )
                    : [...prevState.cart, { ...product, quantity: 1 }];
                return { cart: newCart };
            });
            
            get().calculateTotals();
            toast.success("Product added to cart");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to add to cart");
        }
    },

    removeFromCart: async (productId) => {
        try {
            await axios.delete(`/cart`, { data: { productId } });
            set((prevState) => ({ 
                cart: prevState.cart.filter((item) => item._id !== productId) 
            }));
            get().calculateTotals();
            toast.success("Item removed from cart");
        } catch (error) {
            toast.error("Failed to remove item from cart");
        }
    },

    updateQuantity: async (productId, quantity) => {
        if (quantity < 0) return;
        
        if (quantity === 0) {
            get().removeFromCart(productId);
            return;
        }

        try {
            await axios.put(`/cart/${productId}`, { quantity });
            set((prevState) => ({
                cart: prevState.cart.map((item) => 
                    item._id === productId 
                        ? { ...item, quantity } 
                        : item
                ),
            }));
            get().calculateTotals();
        } catch (error) {
            toast.error("Failed to update quantity");
        }
    },

    calculateTotals: () => {
        const { cart, coupon, isCouponApplied } = get();
        
        // Calculate subtotal
        const subtotal = cart.reduce((sum, item) => 
            sum + (Number(item.price) * item.quantity), 0
        );
        
        // Calculate total with discount if coupon is applied
        let total = subtotal;
        if (coupon && isCouponApplied) {
            const discount = subtotal * (Number(coupon.discountPercentage) / 100);
            total = subtotal - discount;
        }

        // Round to 2 decimal places
        set({ 
            subtotal: Number(subtotal.toFixed(2)), 
            total: Number(total.toFixed(2)) 
        });
    },
}));