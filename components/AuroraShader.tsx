import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Dimensions, ViewProps } from 'react-native';
import { GLView } from 'expo-gl';

// WebGL 1.0 compatible shaders (removed version specifier and updated syntax)
const vertexShader = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;
uniform float uBlend;

// Simplex noise helper functions
vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v){
  const vec4 C = vec4(
      0.211324865405187, 0.366025403784439,
      -0.577350269189626, 0.024390243902439
  );
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);

  vec3 p = permute(
      permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0)
  );

  vec3 m = max(
      0.5 - vec3(
          dot(x0, x0),
          dot(x12.xy, x12.xy),
          dot(x12.zw, x12.zw)
      ), 
      0.0
  );
  m = m * m;
  m = m * m;

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);

  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// Manual implementation of color ramp interpolation
vec3 colorRamp(vec3 color1, vec3 color2, vec3 color3, float factor) {
  if (factor < 0.5) {
    return mix(color1, color2, factor * 2.0);
  } else {
    return mix(color2, color3, (factor - 0.5) * 2.0);
  }
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  
  // Create color ramp
  vec3 rampColor = colorRamp(uColorStops[0], uColorStops[1], uColorStops[2], uv.x);
  
  // Create animated noise for height with multiple octaves for more detail
  float height1 = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
  float height2 = snoise(vec2(uv.x * 4.0 - uTime * 0.05, uTime * 0.15)) * 0.25 * uAmplitude;
  float height = height1 + height2;
  
  height = exp(height);
  height = (uv.y * 2.0 - height + 0.2);
  
  // Add subtle horizontal movement
  float horizontalWave = snoise(vec2(uv.y * 3.0, uTime * 0.2)) * 0.02;
  height += horizontalWave;
  
  float intensity = 0.7 * height;
  
  // Create aurora blend with softer edges
  float midPoint = 0.22;
  float auroraAlpha = smoothstep(midPoint - uBlend * 0.6, midPoint + uBlend * 0.4, intensity);
  
  // Add color variation based on height
  float colorVar = snoise(vec2(uv.x * 3.0 - uTime * 0.07, uv.y * 2.0 + uTime * 0.05)) * 0.15;
  
  // Final color with enhanced vibrancy
  vec3 auroraColor = intensity * rampColor * (1.0 + colorVar) * 1.8; // Increased brightness
  
  // Add stronger glow effect
  float glow = exp(-8.0 * abs(height - 0.1)) * 0.8;
  auroraColor += glow * rampColor * 0.6;
  
  // Make it more visible with higher base opacity
  float finalAlpha = max(auroraAlpha * 1.5, 0.15); // Ensure minimum opacity
  
  gl_FragColor = vec4(auroraColor, finalAlpha);
}
`;

interface AuroraShaderProps extends ViewProps {
  colorStops?: string[];
  amplitude?: number;
  blend?: number;
  speed?: number;
}

// Helper to convert hex colors to RGB
function hexToRgb(hex: string): number[] {
  const result = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  ] : [0, 0, 0];
}

export default function AuroraShader({
  colorStops = ["#5227FF", "#7cff67", "#5227FF"],
  amplitude = 1.0,
  blend = 0.5,
  speed = 1.0,
  style,
  ...props
}: AuroraShaderProps) {
  // Prevent re-renders when not necessary
  const memoizedProps = React.useMemo(() => ({
    colorStops,
    amplitude,
    blend,
    speed
  }), [colorStops.join(','), amplitude, blend, speed]);
  const [animationFrame, setAnimationFrame] = useState<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const { width, height } = Dimensions.get('window');

  // Handle WebGL context creation
  const onContextCreate = (gl: WebGLRenderingContext) => {
    glRef.current = gl;
    startTimeRef.current = Date.now();

    // Create and compile vertex shader
    const vertShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vertShader, vertexShader);
    gl.compileShader(vertShader);
    
    if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
      console.error('Vertex shader compilation failed:', gl.getShaderInfoLog(vertShader));
      return;
    }
    
    // Create and compile fragment shader
    const fragShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fragShader, fragmentShader);
    gl.compileShader(fragShader);
    
    if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
      console.error('Fragment shader compilation failed:', gl.getShaderInfoLog(fragShader));
      return;
    }
    
    // Create and link shader program
    const program = gl.createProgram()!;
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Shader program linking failed:', gl.getProgramInfoLog(program));
      return;
    }
    
    programRef.current = program;
    gl.useProgram(program);
    
    // Setup full-screen triangle vertices
    const vertices = new Float32Array([
      -1, -1,  // Bottom left
       3, -1,  // Bottom right (off-screen)
      -1,  3   // Top left (off-screen)
    ]);
    
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    
    // Enable vertex attribute
    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    
    // Setup shader uniforms
    const timeLocation = gl.getUniformLocation(program, 'uTime');
    const resolutionLocation = gl.getUniformLocation(program, 'uResolution');
    const amplitudeLocation = gl.getUniformLocation(program, 'uAmplitude');
    const blendLocation = gl.getUniformLocation(program, 'uBlend');
    const colorStopsLocation = gl.getUniformLocation(program, 'uColorStops');

    // Convert hex colors to RGB
    const rgbColors: number[] = [];
    memoizedProps.colorStops.forEach(hex => {
      rgbColors.push(...hexToRgb(hex));
    });

    // Set uniform values
    gl.uniform1f(amplitudeLocation, memoizedProps.amplitude);
    gl.uniform1f(blendLocation, memoizedProps.blend);
    
    // Set color stops (3 colors, each with RGB values)
    gl.uniform3fv(colorStopsLocation, new Float32Array(rgbColors));
    
    // Set resolution based on canvas size
    gl.uniform2f(resolutionLocation, gl.drawingBufferWidth, gl.drawingBufferHeight);
    
    // Enable alpha blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    // Animation loop function
    const render = () => {
      if (!gl || !programRef.current) return;
      
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      
      // Update time uniform with smooth timing
      const time = (Date.now() - startTimeRef.current) * 0.001 * speed;
      gl.uniform1f(timeLocation, time);
      
      // Update amplitude and blend for potential animation
      gl.uniform1f(amplitudeLocation, memoizedProps.amplitude);
      gl.uniform1f(blendLocation, memoizedProps.blend);
      
      // Draw the triangle
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.flush();
      
      // Schedule next frame using Expo GL's specific method
      (gl as any).endFrameEXP?.();
      const frame = requestAnimationFrame(render);
      setAnimationFrame(frame);
    };
    
    // Start the animation loop
    render();
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [animationFrame]);
  
  // Add listener for orientation changes
  useEffect(() => {
    const dimensionsChangeHandler = ({ 
      window: { width, height } 
    }: { 
      window: { width: number; height: number } 
    }) => {
      if (glRef.current && programRef.current) {
        const gl = glRef.current;
        const program = programRef.current;
        
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        const resolutionLocation = gl.getUniformLocation(program, 'uResolution');
        gl.uniform2f(resolutionLocation, gl.drawingBufferWidth, gl.drawingBufferHeight);
      }
    };
    
    const subscription = Dimensions.addEventListener('change', dimensionsChangeHandler);
    
    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <View style={[styles.container, style]} pointerEvents="none" {...props}>
      <GLView
        style={StyleSheet.absoluteFill}
        onContextCreate={onContextCreate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 1, // Lower zIndex might be getting hidden
    opacity: 1, // Ensure it's fully visible
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
