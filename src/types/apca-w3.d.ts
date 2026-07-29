declare module "apca-w3" {
  export function calcAPCA(
    text: string | number[],
    bg: string | number[],
    places?: number,
    isInt?: boolean,
  ): number | string;
  export function APCAcontrast(
    textY: number,
    bgY: number,
    places?: number,
  ): number | string;
  export function sRGBtoY(rgb: number[] | string): number;
}
