import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  ImageIcon,
  Upload,
  Download,
  Sparkles,
  Loader2,
  X,
  Wand2,
  Layers,
  History,
  Settings2,
  Crop,
  Eye,
  EyeOff,
  Eraser,
  SunMedium,
  Camera,
  Zap,
  Sparkles as SparklesIcon,
  Palette,
  CloudSun,
  Layout,
  Languages,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Cropper, { Area } from 'react-easy-crop';
import { Mode } from './types';
import { editImage, generateImage, generateWeatherCard, checkHealth } from './api';
import { validateImageFile, extractImageUrl, dataUrlToBlob, downloadImage, getTimestamp } from './utils';
import './App.css';
import 'react-easy-crop/react-easy-crop.css';

type LayerKind = 'source' | 'ai';

interface Layer {
  id: string;
  name: string;
  kind: LayerKind;
  preview?: string | null;
  timestamp: string;
  visible?: boolean;
}

interface QuickEditAction {
  label: string;
  description: string;
  prompt: string;
  negativePrompt?: string;
  icon: LucideIcon;
}

function App() {
  const [image, setImage] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [city, setCity] = useState('');
  const [weatherAspect, setWeatherAspect] = useState('9:16');
  const [weatherLanguage, setWeatherLanguage] = useState('中文');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('edit');
  const [apiConfigured, setApiConfigured] = useState(true);
  const [activeTool, setActiveTool] = useState('select');
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [cropTargetLayerId, setCropTargetLayerId] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [aiLayerCount, setAiLayerCount] = useState(0);
  const [aspect, setAspect] = useState<number | undefined>(3 / 2);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const menuItems = ['Export', 'Help'];

  // Tools available for different modes
  const toolset = mode === 'weather' ? [] : [
    // Select and Filters removed - not supported by Gemini API
    // Weather mode doesn't need any tools
    { id: 'crop', label: 'Crop', icon: Crop },
    { id: 'magic', label: 'Magic', icon: Wand2 },
  ];

  const filterPresets = [
    {
      label: 'Vintage Film',
      prompt: 'Kodak Portra 400 film, warm amber tones, subtle grain texture, vintage color grading, authentic film imperfections, cinematic look',
      category: 'Film'
    },
    {
      label: 'Black & White',
      prompt: 'High contrast black and white, dramatic shadows, rich textures, classic photography, silver gelatin print aesthetic, moody atmosphere',
      category: 'Monochrome'
    },
    {
      label: 'Sepia Tone',
      prompt: 'Warm sepia tones, vintage photograph, antique brown coloring, historical aesthetic, aged paper texture, nostalgic atmosphere',
      category: 'Vintage'
    },
    {
      label: 'High Contrast',
      prompt: 'Extreme contrast, deep blacks, bright highlights, dramatic lighting, bold shadows, punchy colors, vibrant saturation',
      category: 'Dramatic'
    },
    {
      label: 'Soft Glow',
      prompt: 'Soft dreamy glow, ethereal lighting, gentle highlights, warm ambiance, romantic atmosphere, subtle soft focus, luminous quality',
      category: 'Dreamy'
    },
    {
      label: 'Cinematic Teal',
      prompt: 'Cinematic color grading, teal and orange palette, film look, lifted blacks, subtle grain, Hollywood cinematography style',
      category: 'Cinematic'
    },
    {
      label: 'Neon Glow',
      prompt: 'Vibrant neon colors, cyberpunk aesthetic, electric blues and pinks, glowing highlights, futuristic atmosphere, high saturation',
      category: 'Modern'
    },
    {
      label: 'Matte Flat',
      prompt: 'Flat design aesthetic, minimal shadows, clean lighting, modern photography, reduced contrast, contemporary style, flat lay',
      category: 'Minimal'
    },
    {
      label: 'Golden Hour',
      prompt: 'Golden hour lighting, warm sunset tones, long dramatic shadows, magical atmosphere, romantic golden glow, evening light',
      category: 'Lighting'
    },
    {
      label: 'Vintage Polaroid',
      prompt: 'Polaroid instant film, faded colors, white border, authentic polaroid aesthetic, nostalgic snapshot, retro photography',
      category: 'Instant'
    },
    {
      label: 'Studio Lighting',
      prompt: 'Professional studio lighting, clean white background, even illumination, commercial photography, product photography style',
      category: 'Studio'
    },
    {
      label: 'Moody Noir',
      prompt: 'Film noir style, high contrast, deep shadows, dramatic lighting, black and white with blue tint, mysterious atmosphere',
      category: 'Noir'
    }
  ];
  const quickEdits: QuickEditAction[] = [
    {
      label: 'Clean Background',
      description: 'Isolate your subject on a soft studio gradient.',
      prompt:
        'Isolate the main subject, remove distractions, replace background with a soft neutral gradient backdrop, keep natural shadows, commercial studio polish',
      negativePrompt: 'busy background, clutter, extra hands, text, watermark',
      icon: Eraser,
    },
    {
      label: 'Product Pop',
      description: 'Boost contrast, reflections, and clarity.',
      prompt:
        'Create a premium e-commerce hero shot, punchy contrast, sharpened edges, controlled reflections, glossy highlights, gradient sweep backdrop',
      negativePrompt: 'noise, watermark, text overlay, harsh artifacts',
      icon: Camera,
    },
    {
      label: 'Portrait Glow',
      description: 'Retouch skin, add warm rim lighting.',
      prompt:
        'Subtle portrait retouch, even skin tone, soften blemishes, add warm golden rim light, cinematic bokeh background, high-end magazine aesthetic',
      negativePrompt: 'over-smoothing, plastic skin, distortion, vignette',
      icon: SunMedium,
    },
    {
      label: 'Cinematic Mood',
      description: 'Teal & amber film-grade look.',
      prompt:
        'Apply dramatic teal and amber cinematic grade, lifted blacks, gentle bloom, volumetric atmosphere, film grain, widescreen energy',
      negativePrompt: 'washed out, oversaturated, text overlay',
      icon: Palette,
    },
    {
      label: 'Vibrant Neon',
      description: 'Add cyberpunk neon accents.',
      prompt:
        'Introduce neon magenta and cyan rim lighting, subtle glow trails, futuristic highlights, reflective surfaces, cyberpunk energy',
      negativePrompt: 'overexposed, posterization, text badge',
      icon: Zap,
    },
    {
      label: 'Matte Vintage',
      description: 'Soft matte finish with retro tones.',
      prompt:
        'Apply vintage matte film look, muted shadows, gentle halation, warm highlights, dusted texture, analog imperfections',
      negativePrompt: 'heavy grain, scratches, frame border, text',
      icon: SparklesIcon,
    },
  ];
  const aspectPresets = [
    { label: 'Free', ratio: undefined },
    { label: '1:1', ratio: 1 },
    { label: '4:5', ratio: 4 / 5 },
    { label: '3:2', ratio: 3 / 2 },
    { label: '16:9', ratio: 16 / 9 },
  ];

  const weatherAspectPresets = [
    { label: 'Portrait (9:16)', value: '9:16' },
    { label: 'Square (1:1)', value: '1:1' },
    { label: 'Landscape (16:9)', value: '16:9' },
    { label: 'Social (4:5)', value: '4:5' },
  ];

  const weatherLanguagePresets = [
    { label: '中文', value: 'Traditional Chinese' },
    { label: 'Local (Auto)', value: 'Local (Auto)' },
    { label: 'English', value: 'English' },    
    { label: 'Japanese', value: 'Japanese' },
    { label: 'Korean', value: 'Korean' },
  ];

  const registerLayer = useCallback(
    (
      layerData: Omit<Layer, 'id' | 'timestamp'>,
      options?: { replaceKind?: LayerKind; autoSelect?: boolean },
    ) => {
      const layer: Layer = {
        id: `layer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toLocaleTimeString(),
        ...layerData,
        visible: layerData.visible ?? true,
      };

      setLayers((prev) => {
        let base = prev;
        if (options?.replaceKind) {
          base = prev.filter((entry) => entry.kind !== options.replaceKind);
        }
        return [layer, ...base];
      });

      if (options?.autoSelect !== false) {
        setSelectedLayerId(layer.id);
      }
      return layer;
    },
    [],
  );

  const loadImageElement = useCallback((src: string) => {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        console.log(`[IMAGE LOAD] Loaded image, src start: ${src.substring(0, 60)}..., size: ${img.width}x${img.height}`);
        resolve(img);
      };
      img.onerror = (e) => {
        console.error(`[IMAGE LOAD] Failed to load image, src start: ${src.substring(0, 60)}...`, e);
        reject(e);
      };
      img.src = src;
    });
  }, []);



  useEffect(() => {
    if (!layers.length) {
      setSelectedLayerId(null);
      return;
    }
    const exists = layers.some((layer) => layer.id === selectedLayerId);
    if (!exists) {
      setSelectedLayerId(layers[0].id);
    }
  }, [layers, selectedLayerId]);

  const activeLayer = selectedLayerId
    ? layers.find((layer) => layer.id === selectedLayerId) ?? layers[0]
    : layers[0];

  // Display the selected layer if it exists and is visible
  const displayedImage = activeLayer && activeLayer.visible !== false
    ? activeLayer.preview
    : null;
  const canCrop = Boolean(displayedImage);
  const baseImageForSegments = editedImage || image || null;
  const sourceLayer = layers.find((layer) => layer.kind === 'source');
  const historyEntries = [
    'Session started',
    image ? 'Image imported' : null,
    editedImage ? 'AI edit applied' : null,
  ].filter((entry): entry is string => Boolean(entry));

  const baseLayer = useMemo(() => {
    return layers.find((layer) => layer.kind === 'ai') || layers.find((layer) => layer.kind === 'source') || null;
  }, [layers]);

  const cropTargetLayer = useMemo(() => {
    if (cropTargetLayerId) {
      return layers.find((layer) => layer.id === cropTargetLayerId) || null;
    }
    return activeLayer ?? baseLayer;
  }, [activeLayer, baseLayer, cropTargetLayerId, layers]);

  const cropperImage = cropTargetLayer?.preview || baseImageForSegments || displayedImage || null;
  const hasEditableImage = Boolean(image || editedImage);

  const handleToolSelect = useCallback(
    (toolId: string) => {
      setActiveTool(toolId);
      if (toolId === 'crop' && canCrop) {
        const targetLayer = activeLayer ?? baseLayer;
        if (targetLayer) {
          if (selectedLayerId !== targetLayer.id) {
            setSelectedLayerId(targetLayer.id);
          }
          setCropTargetLayerId(targetLayer.id);
        } else {
          setCropTargetLayerId(null);
        }
        setShowCropper(true);
      } else {
        setShowCropper(false);
        setCropTargetLayerId(null);
      }
    },
    [activeLayer, baseLayer, canCrop, image, selectedLayerId],
  );


  useEffect(() => {
    if (activeTool === 'crop' && canCrop) {
      setShowCropper(true);
    } else {
      setShowCropper(false);
    }
  }, [activeTool, canCrop]);

  useEffect(() => {
    if (showCropper) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    } else {
      setCroppedAreaPixels(null);
      setCropTargetLayerId(null);
    }
  }, [showCropper]);

  const onCropComplete = useCallback((_: Area, croppedArea: Area) => {
    setCroppedAreaPixels(croppedArea);
  }, []);

  const getCroppedImage = useCallback(
    (imageSrc: string, croppedArea: Area) =>
      new Promise<string>((resolve, reject) => {
        const imageElement = new Image();
        imageElement.src = imageSrc;
        imageElement.crossOrigin = 'anonymous';
        imageElement.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = croppedArea.width;
          canvas.height = croppedArea.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas not supported'));
            return;
          }
          ctx.drawImage(
            imageElement,
            croppedArea.x,
            croppedArea.y,
            croppedArea.width,
            croppedArea.height,
            0,
            0,
            croppedArea.width,
            croppedArea.height,
          );
          resolve(canvas.toDataURL('image/png'));
        };
        imageElement.onerror = () => reject(new Error('Failed to load image for cropping'));
      }),
    [],
  );

  const handleApplyCrop = useCallback(async () => {
    if (!croppedAreaPixels) return;

    const targetLayer = cropTargetLayer || baseLayer;
    const targetImage = targetLayer?.preview || baseImageForSegments || displayedImage || editedImage || image;

    if (!targetImage) return;

    try {
      const croppedDataUrl = await getCroppedImage(targetImage, croppedAreaPixels);
      const targetKind: LayerKind = targetLayer?.kind ?? (editedImage ? 'ai' : 'source');

      setLayers((prev) => {
        return targetLayer
          ? prev.map((layer) =>
            layer.id === targetLayer.id
              ? { ...layer, preview: croppedDataUrl, timestamp: new Date().toLocaleTimeString() }
              : layer,
          )
          : prev;
      });

      if (targetKind === 'source') {
        setImage(croppedDataUrl);
      } else if (targetKind === 'ai') {
        setEditedImage(croppedDataUrl);
      } else if (!targetLayer) {
        if (editedImage) {
          setEditedImage(croppedDataUrl);
        } else {
          setImage(croppedDataUrl);
        }
      }

      if (targetLayer) {
        setSelectedLayerId(targetLayer.id);
      }

      setShowCropper(false);
      setActiveTool('select');
      setCropTargetLayerId(null);
    } catch (cropError) {
      console.error(cropError);
      setError('Failed to crop image. Please try again.');
    }
  }, [
    baseImageForSegments,
    baseLayer,
    cropTargetLayer,
    croppedAreaPixels,
    displayedImage,
    editedImage,
    getCroppedImage,
    image,
  ]);

  const handleCancelCrop = () => {
    setShowCropper(false);
    setActiveTool('select');
    setCropTargetLayerId(null);
  };

  const handleLayerSelect = (layerId: string) => {
    setSelectedLayerId(layerId);
    const layer = layers.find(l => l.id === layerId);
    console.log('[LAYER SELECT]', layer?.name, 'has preview:', !!layer?.preview);
  };

  const toggleLayerVisibility = useCallback((layerId: string) => {
    setLayers((prev) => {
      return prev.map((layer) =>
        layer.id === layerId ? { ...layer, visible: layer.visible === false ? true : false } : layer,
      );
    });
  }, []);


  const handleAspectPreset = (ratio: number | undefined) => {
    setAspect(ratio);
  };

  const handleApplyFilter = async (filterPrompt: string) => {
    if (!image) {
      setError('Please upload an image first');
      return;
    }

    if (!apiConfigured) {
      setError('API key not configured. Please check backend configuration.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setPrompt(filterPrompt);

    try {
      const data = await editImage({
        image: await dataUrlToBlob(image),
        prompt: filterPrompt.trim(),
        negativePrompt: negativePrompt.trim() || undefined,
      });

      const imageUrl = extractImageUrl(data);
      if (imageUrl) {
        setEditedImage(imageUrl);
        registerLayer({
          name: `Filter: ${filterPrompt.trim().substring(0, 15)}...`,
          kind: 'ai',
          preview: imageUrl,
        });
        setAiLayerCount((c) => c + 1);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Filter application failed';
      setError(errorMessage);
      console.error('Filter error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickEdit = async (action: QuickEditAction) => {
    const baseSource = editedImage || image;
    if (!baseSource) {
      setError('Please upload an image first');
      return;
    }

    if (!apiConfigured) {
      setError('API key not configured. Please check backend configuration.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setPrompt(action.prompt);

    try {
      const blob = await dataUrlToBlob(baseSource);
      const data = await editImage({
        image: blob,
        prompt: action.prompt.trim(),
        negativePrompt: action.negativePrompt?.trim() || undefined,
      });

      const imageUrl = extractImageUrl(data);
      if (imageUrl) {
        setEditedImage(imageUrl);
        registerLayer({
          name: `Quick: ${action.label}`,
          kind: 'ai',
          preview: imageUrl,
        });
        setAiLayerCount((count) => count + 1);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Quick edit failed';
      setError(errorMessage);
      console.error('Quick edit error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMenuClick = (menuItem: string) => {
    switch (menuItem) {
      case 'Export':
        handleDownload();
        break;
      case 'Help':
        window.open('https://github.com/your-repo/nanobanana-studio', '_blank');
        break;
      default:
        break;
    }
  };

  // Check API health on mount
  useEffect(() => {
    checkHealth()
      .then((health) => {
        setApiConfigured(health.apiConfigured);
        if (!health.apiConfigured) {
          setError('API key not configured. Please set GEMINI_API_KEY in backend/.env');
        }
      })
      .catch(() => {
        setError('Unable to connect to backend server');
      });
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Read file
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImage(dataUrl);
      setEditedImage(null);
      setError(null);
      registerLayer(
        {
          name: 'Source Asset',
          kind: 'source',
          preview: dataUrl,
        },
        { replaceKind: 'source' },
      );
      setAiLayerCount(0);
    };
    reader.onerror = () => {
      setError('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  const handleProcess = async () => {
    // Validate inputs
    if (mode === 'weather') {
      if (!city.trim()) {
        setError('Please enter a city name');
        return;
      }
    } else {
      if (!prompt.trim()) {
        setError('Please enter a prompt');
        return;
      }

      if (prompt.length > 2000) {
        setError('Prompt is too long (max 2000 characters)');
        return;
      }
    }

    if (mode === 'edit' && !image) {
      setError('Please upload an image first');
      return;
    }

    if (!apiConfigured) {
      setError('API key not configured. Please check backend configuration.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let data;

      if (mode === 'edit') {
        // Convert data URL to blob
        const blob = await dataUrlToBlob(image!);

        // Call edit API
        data = await editImage({
          image: blob,
          prompt: prompt.trim(),
          negativePrompt: negativePrompt.trim() || undefined,
        });
      } else if (mode === 'weather') {
        // Call weather card API
        data = await generateWeatherCard(city.trim(), weatherAspect, weatherLanguage);
      } else {
        // Call generate API
        data = await generateImage({
          prompt: prompt.trim(),
          negativePrompt: negativePrompt.trim() || undefined,
        });
      }

      // Extract image URL from response
      const imageUrl = extractImageUrl(data);

      if (imageUrl) {
        setEditedImage(imageUrl);
        let layerName = 'Generated Image';
        if (mode === 'edit') layerName = `AI Output ${aiLayerCount + 1}`;
        else if (mode === 'generate') layerName = `Generation ${aiLayerCount + 1}`;
        else if (mode === 'weather') layerName = `Weather Card: ${city}`;
        
        registerLayer({
          name: layerName,
          kind: 'ai',
          preview: imageUrl,
        });
        setAiLayerCount((count) => count + 1);
      } else {
        throw new Error('No image in response. Please try again.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      console.error('Error processing image:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (editedImage) {
      const filename = `nanobanana-${mode}-${getTimestamp()}.png`;
      downloadImage(editedImage, filename);
    }
  };

  const handleClearImage = () => {
    setImage(null);
    setEditedImage(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setError(null);

    // Reset tool selection when switching to weather mode
    if (newMode === 'weather') {
      setActiveTool('select');
      setShowCropper(false);
      setCropTargetLayerId(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleProcess();
    }
  };

  return (
    <div className="app">
      <header className="top-bar">
        <div className="brand">
          <Sparkles className="brand-icon" size={20} />
          <div>
            <p className="brand-title">NanoBanana Studio</p>
            <span className="brand-subtitle">Powered by Google Gemini</span>
          </div>
        </div>

        <div className="quick-action-nav">
          {quickEdits.map((action) => (
            <button
              key={action.label}
              type="button"
              className="quick-action-icon-btn"
              onClick={() => handleQuickEdit(action)}
              disabled={!hasEditableImage || isLoading}
              title={action.description}
            >
              <action.icon size={16} />
              <span>{action.label}</span>
            </button>
          ))}
        </div>

        <nav className="menu-strip">
          {menuItems.map((label) => (
            <button
              key={label}
              className="menu-item"
              type="button"
              onClick={() => handleMenuClick(label)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="status-cluster">
          <span className={`status-dot ${apiConfigured ? 'online' : 'offline'}`} />
          <span>{apiConfigured ? 'Connected' : 'API Offline'}</span>
          <button className="secondary-btn" type="button">
            <Settings2 size={16} />
            Studio prefs
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className="tool-panel">
          {toolset.map((tool) => (
            <button
              key={tool.id}
              className={`tool-btn ${activeTool === tool.id ? 'active' : ''}`}
              onClick={() => handleToolSelect(tool.id)}
              disabled={tool.id === 'crop' && !canCrop}
              type="button"
            >
              <tool.icon size={18} />
              <span>{tool.label}</span>
            </button>
          ))}
        </aside>

        <section className="canvas-shell">
          <div className="options-bar">
            <div>
              <p className="document-title">
                {image ? 'canvas.png' : 'Untitled canvas'}
              </p>
              <span className="document-subtitle">
                {mode === 'edit' ? 'Layered Edit Session' : 'Generative Session'}
              </span>
            </div>
            <div className="mode-toggle chips">
              <button
                className={`mode-chip ${mode === 'edit' ? 'active' : ''}`}
                onClick={() => handleModeChange('edit')}
                disabled={isLoading}
                type="button"
              >
                <ImageIcon size={16} />
                Edit
              </button>
              <button
                className={`mode-chip ${mode === 'generate' ? 'active' : ''}`}
                onClick={() => handleModeChange('generate')}
                disabled={isLoading}
                type="button"
              >
                <Wand2 size={16} />
                Generate
              </button>
              <button
                className={`mode-chip ${mode === 'weather' ? 'active' : ''}`}
                onClick={() => handleModeChange('weather')}
                disabled={isLoading}
                type="button"
              >
                <CloudSun size={16} />
                Weather
              </button>
            </div>
          </div>

          <div className="canvas-stage">
            <div className="canvas-area pro">
              {!displayedImage ? (
                mode === 'edit' ? (
                  <div className="empty-state">
                    <ImageIcon size={64} />
                    <p>Edit Images with AI</p>
                    <span className="hint">Supports JPEG, PNG, and WebP (max 50MB)</span>
                  </div>
                ) : (
                  <div className="empty-state">
                    <Wand2 size={64} />
                    <p>Describe the scene you need</p>
                    <span className="hint">Press Ctrl/Cmd + Enter to generate</span>
                  </div>
                )
              ) : (
                <div className={`image-container framed ${showCropper ? 'cropping' : ''}`}>
                  {showCropper && cropperImage ? (
                    <div className="cropper-wrapper">
                      <Cropper
                        image={cropperImage}
                        crop={crop}
                        zoom={zoom}
                        aspect={aspect}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropComplete}
                      />
                    </div>
                  ) : (
                    <div className="canvas-stack">
                      {displayedImage && (
                        <img
                          src={displayedImage}
                          alt="Canvas preview"
                          className="result-image"
                        />
                      )}
                      {editedImage && (
                        <div className="image-actions floating">
                          <button onClick={handleDownload} className="download-btn" type="button">
                            <Download size={18} />
                            Export PNG
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="stack-panels">
              <div className="panel-card subtle">
                <div className="panel-header">
                  <div className="panel-header-info">
                    <Layers size={16} />
                    <span>Layers</span>
                  </div>
                </div>
                <div className="layer-list">
                  {layers.length === 0 ? (
                    <div className="layer-item muted">Layers will appear here</div>
                  ) : (
                    layers.map((layer) => (
                      <div
                        key={layer.id}
                        onClick={() => handleLayerSelect(layer.id)}
                        className={`layer-item ${layer.id === activeLayer?.id ? 'active' : ''
                          } ${!layer.preview ? 'muted' : ''} ${layer.visible === false ? 'hidden' : ''}`}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleLayerSelect(layer.id);
                          }
                        }}
                      >
                        <div className="layer-meta">
                          <strong>{layer.name}</strong>
                          <span>{layer.timestamp}</span>
                        </div>
                        <div className="layer-actions">
                          <span className={`layer-pill ${layer.kind}`}>{layer.kind}</span>
                          {layer.kind === 'source' && (
                            <button
                              type="button"
                              className="layer-eye-btn"
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleLayerVisibility(layer.id);
                              }}
                              aria-label={layer.visible === false ? 'Show background' : 'Hide background'}
                            >
                              {layer.visible === false ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="panel-card subtle">
                <div className="panel-header">
                  <History size={16} />
                  <span>History</span>
                </div>
                <ul className="history-list">
                  {historyEntries.map((entry) => (
                    <li key={entry}>{entry}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <aside className="control-panel">
          <div className="panel-card">
            <div className="panel-header">
              <h2>{mode === 'edit' ? 'Edit Controls' : 'Generation Controls'}</h2>
            </div>

            {mode === 'edit' && (
              <div className="upload-deck">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,image/webp"
                  onChange={handleImageUpload}
                  className="file-input"
                  id="file-input"
                  disabled={isLoading}
                />
                <label htmlFor="file-input" className={`upload-btn ${isLoading ? 'disabled' : ''}`}>
                  <Upload size={20} />
                  {image ? 'Replace Asset' : 'Import Image'}
                </label>
                {image && (
                  <button
                    className="clear-btn ghost"
                    onClick={handleClearImage}
                    disabled={isLoading}
                    type="button"
                  >
                    <X size={16} />
                    Remove Layer
                  </button>
                )}
              </div>
            )}

            {mode === 'weather' ? (
              <div className="prompt-section">
                <div className="prompt-header">
                  <label htmlFor="city">City Name</label>
                </div>
                <input
                  id="city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Enter city name (e.g., New York, Tokyo)"
                  className="prompt-input"
                  disabled={isLoading}
                  style={{ minHeight: '40px', padding: '8px' }}
                />

                <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="prompt-header">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Layout size={14} /> Aspect Ratio
                    </label>
                  </div>
                  <div className="prompt-header">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Languages size={14} /> Language
                    </label>
                  </div>
                  
                  <select 
                    value={weatherAspect}
                    onChange={(e) => setWeatherAspect(e.target.value)}
                    className="prompt-input"
                    disabled={isLoading}
                    style={{ height: '36px', padding: '0 8px' }}
                  >
                    {weatherAspectPresets.map(preset => (
                      <option key={preset.value} value={preset.value}>{preset.label}</option>
                    ))}
                  </select>

                  <select 
                    value={weatherLanguage}
                    onChange={(e) => setWeatherLanguage(e.target.value)}
                    className="prompt-input"
                    disabled={isLoading}
                    style={{ height: '36px', padding: '0 8px' }}
                  >
                    {weatherLanguagePresets.map(preset => (
                      <option key={preset.value} value={preset.value}>{preset.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <>
                <div className="prompt-section">
                  <div className="prompt-header">
                    <label htmlFor="prompt">
                      {mode === 'edit' ? 'Editing prompt' : 'Generation prompt'}
                    </label>
                    <span className="char-count">{prompt.length}/2000</span>
                  </div>
                  <textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder={
                      mode === 'edit'
                        ? 'Relight the subject with golden hour tones...'
                        : 'Ultra-wide hero shot of a desert city at dusk...'
                    }
                    rows={5}
                    className="prompt-input"
                    disabled={isLoading}
                    maxLength={2000}
                  />
                </div>

                <div className="prompt-section">
                  <label htmlFor="negative-prompt">Negative prompt</label>
                  <textarea
                    id="negative-prompt"
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="Artifacts to avoid (e.g., blur, watermark, distortion)"
                    rows={3}
                    className="prompt-input"
                    disabled={isLoading}
                  />
                </div>
              </>
            )}

            {activeTool === 'crop' && canCrop && (
              <div className="crop-controls">
                <div className="crop-header">
                  <div>
                    <p>Crop controls</p>
                    <span>Use handles directly on canvas</span>
                  </div>
                </div>
                <div className="aspect-options">
                  {aspectPresets.map((preset) => {
                    const isActive = preset.ratio ? aspect === preset.ratio : !aspect;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        className={`aspect-chip ${isActive ? 'active' : ''}`}
                        onClick={() => handleAspectPreset(preset.ratio)}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
                <label className="crop-label" htmlFor="crop-zoom">
                  Zoom
                </label>
                <input
                  id="crop-zoom"
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="crop-slider"
                />
                <div className="crop-actions">
                  <button className="clear-btn ghost" type="button" onClick={handleCancelCrop}>
                    Cancel
                  </button>
                  <button
                    className="primary-btn"
                    type="button"
                    onClick={handleApplyCrop}
                    disabled={!croppedAreaPixels}
                  >
                    Apply crop
                  </button>
                </div>
              </div>
            )}

            {activeTool === 'filters' && (
              <div className="filters-panel">
                <div className="panel-header">
                  <h2>Photo Filters</h2>
                  <span>Apply instant AI filters to your image</span>
                </div>

                <div className="filters-grid">
                  {filterPresets.map((filter) => (
                    <button
                      key={filter.label}
                      type="button"
                      className="filter-chip"
                      onClick={() => handleApplyFilter(filter.prompt)}
                      title={filter.prompt}
                    >
                      <div className="filter-label">{filter.label}</div>
                      <div className="filter-category">{filter.category}</div>
                    </button>
                  ))}
                </div>

                <div className="filter-instructions">
                  <p>Click any filter to instantly apply it to your image using AI. Each filter uses carefully crafted prompts for professional results.</p>
                </div>
              </div>
            )}

            <button
              onClick={handleProcess}
              disabled={isLoading || (mode === 'edit' && !image) || (mode === 'weather' ? !city.trim() : !prompt.trim())}
              className="edit-btn"
              title="Ctrl/Cmd + Enter"
              type="button"
            >
              {isLoading ? (
                <>
                  <Loader2 className="spinner" size={20} />
                  Processing...
                </>
              ) : (
                <>
                  {mode === 'weather' ? <CloudSun size={20} /> : <Sparkles size={20} />}
                  {mode === 'edit' ? 'Run Edit' : (mode === 'weather' ? 'Generate Weather Card' : 'Generate Image')}
                </>
              )}
            </button>

            {error && (
              <div className="error-message">
                <strong>Error:</strong> {error}
              </div>
            )}

            {!apiConfigured && !error && (
              <div className="warning-message">⚠️ API key not configured</div>
            )}
          </div>
        </aside>
      </div>

      <footer className="status-bar">
        <span>Zoom 100%</span>
        <span>Document RGB • 16-bit</span>
        <span>{isLoading ? 'Working...' : 'Idle'}</span>
      </footer>
    </div>
  );
}

export default App;
