import { useLayoutEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigationType } from "react-router-dom";
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
import { LoginRequiredDialog } from "@/features/consumer/auth/loginGate";
import { NotFoundPage } from "@/features/consumer/ui";
import { DealDetailPage } from "@/features/consumer/discovery/DealDetailPage";
import { BusinessDetailPage } from "@/features/consumer/discovery/BusinessDetailPage";
import DealKitManager from "@/features/consumer/discovery/DealKitManager";
import BusinessMenuManager from "@/features/consumer/discovery/BusinessMenuManager";
import { BusinessListPage } from "@/features/consumer/discovery/BusinessListPage";
import ProvidedCatalogRedirect from "@/features/consumer/discovery/ProvidedCatalogPage";
import LocationPage from "@/features/consumer/LocationPage";
import OnboardingPage from "@/features/consumer/OnboardingPage";
import CheckoutPage from "@/features/consumer/booking/CheckoutPage";
import BookingCompletePage from "@/features/consumer/booking/BookingCompletePage";
import { CommunityPage, CommunityEditorPage, CommunityPostPage } from "@/features/consumer/engagement/CommunityPages";
import { RewardsPage, FortunePage } from "@/features/consumer/engagement/RewardsPages";
import { NotificationsPage, SettingsPage, ShortsPage } from "@/features/consumer/engagement/UtilityPages";

export default function Router() {
  return (
    <BrowserRouter><AppContent /></BrowserRouter>
  );
}

function AppContent() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();
  // A new page starts at its header. Keep browser Back/Forward restoration and
  // in-page links; changing a filter/query must not jump a list to the top.
  useLayoutEffect(() => {
    if (navigationType !== "POP" && !hash) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, hash, navigationType]);
  const avatarPage = pathname === "/rewards" || pathname === "/avatar-3d" || pathname.startsWith("/mypage/playground") || pathname === "/fortune";
  return <div className={avatarPage ? "avatar-app" : "reference-ui"} data-page={pathname === "/" ? "home" : pathname.split("/")[1]}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth/*" element={<Auth />} />
        <Route path="/reservation/*" element={<Reservation />} />
        <Route path="/content" element={<Content />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/mypage/*" element={<MyPage />} />
        <Route path="/product/:productId" element={<ProductDetail />} />
        <Route path="/deal/:dealId" element={<DealDetailPage />} />
        <Route path="/business/:businessId" element={<BusinessDetailPage />} />
        <Route path="/business/:businessId/manage-menu" element={<BusinessMenuManager />} />
        <Route path="/business/:businessId/manage-deal-kits" element={<DealKitManager />} />
        <Route path="/businesses" element={<BusinessListPage />} />
        <Route path="/provided" element={<ProvidedCatalogRedirect />} />
        <Route path="/provided/:slug" element={<ProvidedCatalogRedirect />} />
        <Route path="/checkout/kit/:kitId" element={<CheckoutPage />} />
        <Route path="/checkout/:dealId" element={<CheckoutPage />} />
        <Route path="/booking/complete/:reservationId" element={<BookingCompletePage />} />
        <Route path="/package" element={<PackageHome />} />
        <Route path="/package/special" element={<SpecialPackage />} />
        <Route path="/package/one-shop" element={<OneShopPackage />} />
        <Route path="/package/shop-shop" element={<ShopShopPackage />} />
        <Route path="/package/detail/:packageId" element={<PackageDetail />} />
        <Route path="/package/template/:templateId" element={<PackageDetail />} />
        <Route path="/search" element={<Search />} />
        <Route path="/nearby" element={<Nearby />} />
        <Route path="/location" element={<LocationPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/community/new" element={<CommunityEditorPage />} />
        <Route path="/community/:postId" element={<CommunityPostPage />} />
        <Route path="/rewards" element={<RewardsPage />} />
        <Route path="/avatar-3d" element={<Navigate to="/rewards?tab=wardrobe" replace />} />
        <Route path="/fortune" element={<FortunePage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/shorts" element={<ShortsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <BottomNav />
      <LoginRequiredDialog />
    </div>;
}
