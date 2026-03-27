# 🧞 Genie Effect Animation (React Native)

This project implements a macOS-style Genie minimize animation in React Native using modern animation and rendering libraries.

## 📸 Demo

| iOS                                                                                                                 |
|---------------------------------------------------------------------------------------------------------------------|
|<video src="https://github.com/user-attachments/assets/db38728a-ba26-4393-9707-7f46b0faf11d"/> |


## ✨ Overview

The Genie effect is a visually rich animation where a window:

- Bends and deforms
- Collapses toward a target point (dock)
- Restores back from the same position

Instead of using simple scale or translate animations, this implementation recreates the effect using **mesh-based warping**, resulting in a smooth and realistic experience similar to macOS.

## 🎬 Features

- 🧞 Genie-style minimize animation
- 🔄 Reverse restore animation
- 📍 Dynamic dock position (draggable)
- 🎯 Animation adapts to dock location in real-time
- ⚡ Smooth 60fps performance
- 🧩 Modular and reusable architecture

## 🧠 How It Works

### 1. Mesh-Based Rendering

The UI is rendered as a mesh (grid of vertices) instead of a static view. This allows individual parts of the UI to move independently.

### 2. Vertex Warping

During animation:

- **Top vertices** remain mostly stable
- **Middle vertices** curve inward
- **Bottom vertices** collapse toward the dock

This creates the curved "suction" effect.

### 3. Animation Control

A shared animation value (`progress`) drives the entire transformation:

| Value | State                        |
| ----- | ---------------------------- |
| `0`   | Fully expanded view          |
| `1`   | Fully minimized into dock    |

### 4. Dynamic Target (Dock)

- A draggable dock icon defines the target position
- The animation dynamically adjusts based on its position
- Ensures realistic and flexible behavior

### 5. Interaction Flow

| Action             | Result                    |
| ------------------ | ------------------------- |
| Tap minimize icon  | Starts genie animation    |
| Drag dock          | Changes animation target  |
| Tap dock           | Restores the view         |

## 🏗️ Tech Stack

- **Expo** — Development platform & build tooling
- **React Native** — Core framework
- **React Native Skia** — Rendering & mesh warping
- **React Native Reanimated** — Smooth native-driven animations
- **React Native Gesture Handler** — Drag interactions

## 📦 Architecture

```
/components
  ├── GenieEffect.tsx
  ├── DockIcon.tsx

/hooks
  ├── useGenieMesh.ts

/utils
  ├── genieWarp.ts
```

## ⚙️ Key Concepts

### Mesh Grid

The UI is broken into a grid of points (vertices) which can be moved independently.

### Warping

Instead of transforming the whole view, individual vertices are repositioned to create deformation.

### Shared Values

Animation state is managed using shared values for high performance on the UI thread.

## 🚀 Performance Considerations

- Uses native-driven animations for smooth 60fps performance
- Minimizes re-renders using hooks and memoization
- Mesh resolution is balanced for visual quality vs performance
