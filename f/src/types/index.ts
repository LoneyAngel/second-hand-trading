// 用户类型
export interface User {
  id: string;
  phone: string;
  nickname: string | null;
  avatar: string | null;
  createdAt?: string;
}

// 分类类型
export interface Category {
  id: string;
  name: string;
  icon: string | null;
  sort: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    products: number;
  };
}

// 商品状态枚举
export type ProductStatus = 'available' | 'rented' | 'maintenance' | 'delist';

// 价格单位类型
export type PriceUnit = 'day' | 'hour' | 'once';

// 商品类型
export interface Product {
  id: string;
  title: string;
  description: string | null;
  price: number;
  deposit: number;
  images: string[];
  status: ProductStatus;
  userId: string;
  categoryId: string;
  user: User;
  category: Category;
  createdAt: string;
  updatedAt: string;
  priceUnit?: PriceUnit;
}

// 租借状态枚举
export type RentalStatus = 'pending' | 'ongoing' | 'completed' | 'cancelled' | 'disputed';

// 租借记录类型
export interface RentalRecord {
  id: string;
  productId: string;
  product: Product;
  renterId: string;
  renter: User;
  ownerId: string;
  owner: User;
  startDate: string;
  endDate: string;
  totalAmount: number;
  deposit: number;
  status: RentalStatus;
  createdAt: string;
  updatedAt: string;
}

// 认证相关类型
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface LoginData {
  phone: string;
  password: string;
}

export interface RegisterData {
  phone: string;
  password: string;
  nickname?: string;
}

export interface RefreshTokenData {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

// 商品相关类型
export interface CreateProductData {
  title: string;
  description?: string;
  price: number;
  deposit: number;
  images: string[];
  categoryId: string;
  priceUnit?: PriceUnit;
  status?: ProductStatus;
}

export interface UpdateProductData extends Partial<CreateProductData> {}

export interface UpdateUserData {
  nickname?: string;
  avatar?: string;
}

export interface ProductListParams {
  categoryId?: string;
  status?: ProductStatus;
  page?: number;
  limit?: number;
  search?: string;
}

export interface ProductListResponse {
  data: Product[];
  hasMore: boolean;
}

// 推荐商品分组类型
export interface AdviseProductGroup {
  id: string;
  name: string;
  products: Product[];
}

// 推荐商品响应类型
export interface AdviseProductsResponse {
  data: AdviseProductGroup[];
}

// 租借相关类型
export interface CreateRentalData {
  productId: string;
  startDate: string;
  endDate: string;
}

export interface UpdateRentalStatusData {
  status: RentalStatus;
}

// 通用响应类型
export interface MessageResponse {
  message: string;
}

export interface ProductDetail extends Product {
  isFavorited: boolean;
}

export interface FootPrint {
  id: string;
  userId: string;
  productId: string;
  product: Product;
  createdAt: string;
}

// 关注用户类型
export interface FollowUser {
  id: string;
  nickname: string | null;
  avatar: string | null;
  createdAt: string;
}

// 关注关系类型
export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  following: FollowUser;
  createdAt: string;
}

// 关注列表响应
export interface FollowListResponse {
  data: Follow[];
  hasMore: boolean;
}

// 扩展 ProductDetail，添加是否关注字段和评论统计
export interface ProductDetail extends Product {
  isFavorited: boolean;
  isFollowingOwner?: boolean;
  reviewCount?: number;
  averageRating?: number;
}

// 评论类型
export interface Review {
  id: string;
  productId: string;
  userId: string;
  user: User;
  rentalId?: string | null;
  rating: number;
  content: string | null;
  images: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ReviewListResponse {
  data: Review[];
  total: number;
  averageRating: number;
  ratingCounts: Record<number, number>;
}

export interface ReviewLatestResponse {
  data: Review | null;
  averageRating: number;
  reviewCount: number;
  ratingCounts: Record<number, number>;
}

export interface ReviewListParams {
  rating?: number;
  page?: number;
  limit?: number;
}

// 地址相关类型
export interface Address {
  id: string;
  consignee: string;
  mobile: string;
  detailAddress: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddressData {
  consignee: string;
  mobile: string;
  detailAddress: string;
}

export interface UpdateAddressData extends Partial<CreateAddressData> {}

export interface AddressListResponse {
  data: Address[];
}
