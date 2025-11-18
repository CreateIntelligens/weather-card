declare module 'react-easy-crop' {
  import { ComponentType } from 'react';

  export interface Area {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  export interface CropCoordinates {
    x: number;
    y: number;
  }

  export interface CropperProps {
    image?: string;
    crop?: CropCoordinates;
    zoom?: number;
    aspect?: number;
    onCropChange?: (value: CropCoordinates) => void;
    onZoomChange?: (value: number) => void;
    onCropComplete?: (croppedArea: Area, croppedAreaPixels: Area) => void;
    restrictPosition?: boolean;
  }

  const Cropper: ComponentType<CropperProps>;
  export default Cropper;
}

