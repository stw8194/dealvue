import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./Home";
import Reservation from "./Reservation";
import Content from "./Content";
import Wishlist from "./Wishlist";
import MyPage from "./MyPage";
import ProductDetail from "./Product/ProductDetail";
import PackageHome from "./Package";
import SpecialPackage from "./Package/SpecialPackage";
import OneShopPackage from "./Package/OneShopPackage";
import ShopShopPackage from "./Package/ShopShopPackage";
import PackageDetail from "./Package/PackageDetail";
import Search from "./Search";
import Nearby from "./Nearby";
import Auth from "./Auth";
import BottomNav from "@/components/layout/BottomNav";

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth/*" element={<Auth />} />
        <Route path="/reservation/*" element={<Reservation />} />
        <Route path="/content" element={<Content />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/mypage/*" element={<MyPage />} />
        <Route path="/product/:productId" element={<ProductDetail />} />
        <Route path="/package" element={<PackageHome />} />
        <Route path="/package/special" element={<SpecialPackage />} />
        <Route path="/package/one-shop" element={<OneShopPackage />} />
        <Route path="/package/shop-shop" element={<ShopShopPackage />} />
        <Route path="/package/detail/:packageId" element={<PackageDetail />} />
        <Route path="/search" element={<Search />} />
        <Route path="/nearby" element={<Nearby />} />
      </Routes>
      <BottomNav />
    </BrowserRouter>
  );
}
