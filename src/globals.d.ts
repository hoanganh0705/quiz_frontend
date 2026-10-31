declare module "*.css";
declare module "swiper/css";
declare module "swiper/css/*";
declare module "*?raw" {
const content: string;
export default content;
}
