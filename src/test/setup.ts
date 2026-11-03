import '@testing-library/jest-dom/vitest';

Object.defineProperty(window, 'matchMedia', { configurable:true, value:()=>({matches:false,addListener:()=>{},removeListener:()=>{},addEventListener:()=>{},removeEventListener:()=>{},dispatchEvent:()=>false}) });
