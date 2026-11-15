import * as THREE from 'three';
import {
  getBibTex,
  getBookCoverTex,
  getBrainTex,
  getCorduroyPatternTex,
  getPolkaPatternTex,
  getStripePatternTex,
  makeFeltMaterial,
} from './FeltMaterials';

export interface PuppetRig {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
}

interface FaceOptions {
  zOffset: number;
  eyeScale?: number;
  eyeSpacing?: number;
  eyeY?: number;
  leftIrisColor?: number;
  rightIrisColor?: number;
  eyeRimColor?: number;
  leftSizeMult?: number;
  rightSizeMult?: number;
  mouthY?: number;
  mouthWidth?: number;
  mouthOpen?: number;
  browColor?: number;
  cheekColor?: number;
  stitches?: boolean;
  eyepatchRight?: boolean;
}

function addZombieFace(head: THREE.Group, opts: FaceOptions): void {
  const {
    zOffset,
    eyeScale = 1,
    eyeSpacing = 0.18,
    eyeY = 0.06,
    leftIrisColor = 0x2b241d,
    rightIrisColor = leftIrisColor,
    eyeRimColor,
    leftSizeMult = 1.04,
    rightSizeMult = 0.96,
    mouthY = -0.17,
    mouthWidth = 0.3,
    mouthOpen = 0.11,
    browColor = 0x2a2224,
    cheekColor,
    stitches = true,
    eyepatchRight = false,
  } = opts;

  const eyeWhiteMat = makeFeltMaterial(0xf7f1d5, { roughness: 0.85, bumpScale: 0.01 });
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x111218, roughness: 0.28 });
  const catchMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const browMat = makeFeltMaterial(browColor);

  // Eyes (left = -X, right = +X)
  [-1, 1].forEach((side, idx) => {
    if (side > 0 && eyepatchRight) {
      // Black felt eyepatch + diagonal strap
      const patchMat = makeFeltMaterial(0x1b1a22);
      const patch = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.14, 0.05, 14), patchMat);
      patch.rotation.x = Math.PI / 2;
      patch.position.set(eyeSpacing, eyeY, zOffset + 0.04);
      head.add(patch);

      const strap = new THREE.Mesh(new THREE.TorusGeometry(zOffset + 0.045, 0.018, 6, 22), patchMat);
      strap.rotation.set(Math.PI / 2 - 0.34, 0.35, 0);
      strap.position.set(0, 0.12, 0.01);
      head.add(strap);
      return;
    }

    const s = eyeScale * (idx === 0 ? leftSizeMult : rightSizeMult);
    const irisColor = idx === 0 ? leftIrisColor : rightIrisColor;

    if (eyeRimColor !== undefined) {
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.142 * s, 0.024 * s, 8, 18),
        makeFeltMaterial(eyeRimColor)
      );
      rim.position.set(side * eyeSpacing, eyeY, zOffset + 0.02 * s);
      head.add(rim);
    }

    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.14 * s, 14, 14), eyeWhiteMat);
    sclera.position.set(side * eyeSpacing, eyeY, zOffset);
    sclera.scale.z = 0.65;
    head.add(sclera);

    const iris = new THREE.Mesh(
      new THREE.CylinderGeometry(0.068 * s, 0.068 * s, 0.02, 12),
      new THREE.MeshStandardMaterial({ color: irisColor, roughness: 0.5 })
    );
    iris.rotation.x = Math.PI / 2;
    iris.position.set(side * eyeSpacing, eyeY, zOffset + 0.08 * s);
    head.add(iris);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.036 * s, 10, 10), pupilMat);
    pupil.position.set(side * eyeSpacing, eyeY, zOffset + 0.086 * s);
    head.add(pupil);

    const catchlight = new THREE.Mesh(new THREE.SphereGeometry(0.016 * s, 6, 6), catchMat);
    catchlight.position.set(side * eyeSpacing - 0.022 * s, eyeY + 0.025 * s, zOffset + 0.115 * s);
    head.add(catchlight);

    // Cute curved felt brow
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.12 * s, 4, 8), browMat);
    brow.rotation.z = Math.PI / 2 - side * 0.14;
    brow.position.set(side * eyeSpacing, eyeY + 0.17 * s, zOffset + 0.01);
    head.add(brow);
  });

  // Zombie nostrils (two tiny dark dots)
  const nostrilMat = new THREE.MeshStandardMaterial({ color: 0x1f1215, roughness: 0.9 });
  [-0.03, 0.03].forEach((nx, idx) => {
    const nos = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), nostrilMat);
    nos.scale.set(0.8, 1.3, 0.6);
    nos.rotation.z = idx === 0 ? 0.25 : -0.25;
    nos.position.set(nx, mouthY + mouthOpen * 0.5 + 0.065, zOffset + 0.035);
    head.add(nos);
  });

  // Mouth interior + tongue + crooked teeth
  const mouthMat = new THREE.MeshStandardMaterial({ color: 0x261015, roughness: 0.95 });
  const mouth = new THREE.Mesh(new THREE.CylinderGeometry(mouthWidth * 0.5, mouthWidth * 0.44, 0.07, 14), mouthMat);
  mouth.rotation.x = Math.PI / 2;
  mouth.scale.set(1, 1, mouthOpen / (mouthWidth * 0.5));
  mouth.position.set(0, mouthY, zOffset - 0.01);
  head.add(mouth);

  const tongueMat = makeFeltMaterial(0xc95f6b);
  const tongue = new THREE.Mesh(new THREE.SphereGeometry(mouthWidth * 0.26, 10, 8), tongueMat);
  tongue.scale.set(1.1, 0.45, 0.6);
  tongue.position.set(0, mouthY - mouthOpen * 0.3, zOffset + 0.01);
  head.add(tongue);

  const toothMat = makeFeltMaterial(0xf3eedc, { roughness: 0.78 });
  const toothCount = 4;
  for (let i = 0; i < toothCount; i++) {
    const t = (i / (toothCount - 1) - 0.5) * (mouthWidth * 0.65);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.042, 0.038), toothMat);
    upper.position.set(t + (i % 2 === 0 ? 0.008 : -0.008), mouthY + mouthOpen * 0.36, zOffset + 0.016);
    upper.rotation.z = (i - 1.5) * 0.08;
    head.add(upper);

    if (i === 1 || i === 2) {
      const lower = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.036, 0.036), toothMat);
      lower.position.set(t * 0.85, mouthY - mouthOpen * 0.36, zOffset + 0.016);
      head.add(lower);
    }
  }

  // Optional cheek blush / smudge
  if (cheekColor !== undefined) {
    const cheekMat = makeFeltMaterial(cheekColor, { roughness: 0.95 });
    [-1, 1].forEach((side) => {
      const chk = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), cheekMat);
      chk.scale.set(1.1, 0.85, 0.4);
      chk.position.set(side * (eyeSpacing + 0.13), mouthY + 0.05, zOffset - 0.05);
      head.add(chk);
    });
  }

  // Optional head stitches
  if (stitches) {
    const stMat = new THREE.MeshStandardMaterial({ color: 0x1c1719, roughness: 0.9 });
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.075, 5), stMat);
      s.position.set(0.22 + i * 0.04, 0.27 - i * 0.03, zOffset * 0.55);
      s.rotation.set(0.4, 0.2, 0.7);
      head.add(s);
    }
  }
}

function addFeltEars(head: THREE.Group, skinMat: THREE.Material, earX = 0.41, earY = -0.02, earSize = 0.1): void {
  const innerMat = new THREE.MeshStandardMaterial({ color: 0x3b262a, roughness: 0.95 });
  [-1, 1].forEach((side) => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(earSize, 10, 10), skinMat);
    ear.scale.set(0.55, 1, 0.72);
    ear.position.set(side * earX, earY, 0);
    head.add(ear);

    const inner = new THREE.Mesh(new THREE.SphereGeometry(earSize * 0.52, 8, 8), innerMat);
    inner.scale.set(0.35, 0.85, 0.55);
    inner.position.set(side * (earX + 0.015), earY, 0.025);
    head.add(inner);
  });
}

function makeFeltHand(skinMat: THREE.Material, peaceSign = false): THREE.Group {
  const hand = new THREE.Group();
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 10), skinMat);
  palm.scale.set(0.95, 1.05, 0.75);
  hand.add(palm);

  if (peaceSign) {
    // 2 raised V-sign fingers + thumb
    [-0.035, 0.035].forEach((fx, idx) => {
      const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.085, 4, 6), skinMat);
      f.position.set(fx, -0.1, 0.01);
      f.rotation.z = idx === 0 ? -0.22 : 0.22;
      hand.add(f);
    });
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.024, 0.05, 4, 6), skinMat);
    thumb.position.set(-0.075, -0.02, 0.03);
    thumb.rotation.z = 0.65;
    hand.add(thumb);
  } else {
    // 3 cute stubby fingers + thumb
    for (let i = -1; i <= 1; i++) {
      const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.048, 4, 6), skinMat);
      f.position.set(i * 0.034, -0.075, 0.015);
      f.rotation.z = i * 0.14;
      hand.add(f);
    }
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.021, 0.042, 4, 6), skinMat);
    thumb.position.set(-0.068, -0.02, 0.03);
    thumb.rotation.z = 0.6;
    hand.add(thumb);
  }
  return hand;
}

function makeFeltFoot(footMat: THREE.Material, isShoe = false): THREE.Group {
  const foot = new THREE.Group();
  const base = new THREE.Mesh(new THREE.SphereGeometry(0.135, 12, 10), footMat);
  base.scale.set(1.02, 0.66, 1.48);
  base.castShadow = true;
  foot.add(base);

  if (!isShoe) {
    // Cute stubby toes
    for (let i = -1; i <= 1; i++) {
      const toe = new THREE.Mesh(new THREE.SphereGeometry(0.036, 7, 7), footMat);
      toe.position.set(i * 0.05, -0.025, 0.175);
      foot.add(toe);
    }
  }
  return foot;
}

function makeShadowBlob(radius = 0.74): THREE.Mesh {
  const mat = new THREE.MeshBasicMaterial({
    color: 0x050811,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(radius, 22), mat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  return shadow;
}

interface LimbOptions {
  armX?: number;
  armY?: number;
  armLen?: number;
  armRad?: number;
  legX?: number;
  legY?: number;
  legLen?: number;
  legRad?: number;
  sleeveMat?: THREE.Material;
  leftFootMat?: THREE.Material;
  rightFootMat?: THREE.Material;
  leftShoe?: boolean;
  rightShoe?: boolean;
  peaceHands?: boolean;
  springArms?: boolean;
  bandageMat?: THREE.Material;
}

function addDetailedLimbs(
  body: THREE.Group,
  leftArm: THREE.Group,
  rightArm: THREE.Group,
  leftLeg: THREE.Group,
  rightLeg: THREE.Group,
  armSkinMat: THREE.Material,
  handSkinMat: THREE.Material,
  legMat: THREE.Material,
  defaultFootMat: THREE.Material,
  opts: LimbOptions = {}
): void {
  const {
    armX = 0.4,
    armY = 1.12,
    armLen = 0.36,
    armRad = 0.088,
    legX = 0.17,
    legY = 0.54,
    legLen = 0.32,
    legRad = 0.105,
    sleeveMat,
    leftFootMat = defaultFootMat,
    rightFootMat = defaultFootMat,
    leftShoe = false,
    rightShoe = false,
    peaceHands = false,
    springArms = false,
    bandageMat,
  } = opts;

  [-1, 1].forEach((side) => {
    const armGrp = side < 0 ? leftArm : rightArm;
    armGrp.position.set(side * armX, armY, 0);

    if (springArms) {
      // Coiled metallic spring arm!
      for (let r = 0; r < 6; r++) {
        const coil = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.017, 7, 14), armSkinMat);
        coil.rotation.x = Math.PI / 2 + 0.15;
        coil.position.y = -0.05 - r * 0.058;
        coil.castShadow = true;
        armGrp.add(coil);
      }
    } else {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(armRad, armLen, 6, 10), armSkinMat);
      arm.position.y = -armLen * 0.54;
      arm.castShadow = true;
      armGrp.add(arm);

      if (sleeveMat) {
        const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(armRad * 1.15, armRad * 1.4, armLen * 0.55, 10), sleeveMat);
        sleeve.position.y = -armLen * 0.2;
        sleeve.castShadow = true;
        armGrp.add(sleeve);
      }

      if (bandageMat) {
        for (let b = 0; b < 3; b++) {
          const wrap = new THREE.Mesh(new THREE.TorusGeometry(armRad * 1.04, 0.016, 6, 12), bandageMat);
          wrap.rotation.set(Math.PI / 2 + (b % 2 === 0 ? 0.25 : -0.25), 0, 0);
          wrap.position.y = -0.08 - b * 0.11;
          armGrp.add(wrap);
        }
      }
    }

    const hand = makeFeltHand(handSkinMat, peaceHands);
    hand.position.y = -armLen - 0.08;
    armGrp.add(hand);
    body.add(armGrp);

    const legGrp = side < 0 ? leftLeg : rightLeg;
    legGrp.position.set(side * legX, legY, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(legRad, legLen, 6, 10), legMat);
    leg.position.y = -legLen * 0.54;
    leg.castShadow = true;
    legGrp.add(leg);

    if (bandageMat) {
      for (let b = 0; b < 2; b++) {
        const wrap = new THREE.Mesh(new THREE.TorusGeometry(legRad * 1.05, 0.017, 6, 12), bandageMat);
        wrap.rotation.set(Math.PI / 2 + 0.2, 0, 0);
        wrap.position.y = -0.1 - b * 0.13;
        legGrp.add(wrap);
      }
    }

    const fMat = side < 0 ? leftFootMat : rightFootMat;
    const isShoe = side < 0 ? leftShoe : rightShoe;
    const foot = makeFeltFoot(fMat, isShoe);
    foot.position.set(0, -legLen - 0.1, 0.055);
    legGrp.add(foot);
    body.add(legGrp);
  });
}

function addButton(parent: THREE.Object3D, x: number, y: number, z: number, color: number, radius = 0.055): void {
  const btnMat = new THREE.MeshStandardMaterial({ color, roughness: 0.45 });
  const btn = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.025, 12), btnMat);
  btn.rotation.x = Math.PI / 2;
  btn.position.set(x, y, z);
  parent.add(btn);
}

function addPatch(parent: THREE.Object3D, x: number, y: number, z: number, color: number, w = 0.11, h = 0.11, rotY = 0): void {
  const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.03), makeFeltMaterial(color));
  p.position.set(x, y, z);
  p.rotation.y = rotY;
  parent.add(p);
}

export function buildPlayablePuppet(charId: string): PuppetRig {
  const root = new THREE.Group();
  root.add(makeShadowBlob());

  const body = new THREE.Group();
  root.add(body);

  const head = new THREE.Group();
  const leftArm = new THREE.Group();
  const rightArm = new THREE.Group();
  const leftLeg = new THREE.Group();
  const rightLeg = new THREE.Group();

  if (charId === 'red_hatter') {
    const skinMat = makeFeltMaterial(0xd94545);
    const shirtMat = makeFeltMaterial(0xeae2d2);
    const jeansMat = makeFeltMaterial(0x3a649c);
    const bootMat = makeFeltMaterial(0x694329);
    const strapMat = makeFeltMaterial(0x523623);

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 0.68, 16), shirtMat);
    torso.position.y = 0.92;
    torso.castShadow = true;
    body.add(torso);
    // Red tear spot on shirt + jagged bottom hem
    addPatch(body, 0.12, 1.03, 0.29, 0xc73c3c, 0.08, 0.09);

    const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.2, 14), jeansMat);
    pelvis.position.y = 0.56;
    body.add(pelvis);

    head.position.set(0, 1.6, 0);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.41, 18, 16), skinMat);
    skull.scale.set(0.96, 1.08, 0.95);
    skull.castShadow = true;
    head.add(skull);
    addFeltEars(head, skinMat, 0.4, -0.02, 0.09);
    addZombieFace(head, {
      zOffset: 0.36,
      eyeScale: 1.04,
      eyeSpacing: 0.17,
      leftIrisColor: 0x241d18,
      mouthWidth: 0.33,
      mouthOpen: 0.12,
      stitches: true,
    });

    // Iconic brown work boot worn on head!
    const bootAnkle = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.21, 0.36, 14), bootMat);
    bootAnkle.position.set(0.02, 0.52, -0.02);
    bootAnkle.rotation.z = 0.14;
    bootAnkle.castShadow = true;
    head.add(bootAnkle);
    const bootToe = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.22, 6, 12), bootMat);
    bootToe.rotation.x = Math.PI / 2;
    bootToe.rotation.z = 0.14;
    bootToe.position.set(-0.08, 0.69, 0.04);
    bootToe.castShadow = true;
    head.add(bootToe);
    // Boot laces
    for (let l = 0; l < 3; l++) {
      const lace = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.022, 0.04), strapMat);
      lace.position.set(0.01, 0.44 + l * 0.08, 0.16);
      lace.rotation.z = 0.14;
      head.add(lace);
    }
    body.add(head);

    addDetailedLimbs(body, leftArm, rightArm, leftLeg, rightLeg, skinMat, skinMat, jeansMat, skinMat, {
      armX: 0.37,
      armY: 1.18,
      armLen: 0.42,
      armRad: 0.075,
      legX: 0.16,
      legY: 0.54,
      legLen: 0.38,
      legRad: 0.095,
      sleeveMat: shirtMat,
    });
    // Red knee patches & ankle strap on left leg
    addPatch(leftLeg, 0, -0.2, 0.09, 0xd94545, 0.1, 0.1);
    const ankleStrap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.14, 12), strapMat);
    ankleStrap.position.set(0, -0.34, 0);
    leftLeg.add(ankleStrap);
  } else if (charId === 'blue_partin') {
    const skinMat = makeFeltMaterial(0x3ba9de);
    const shirtMat = makeFeltMaterial(0xe7dfd1);
    const pantsMat = makeFeltMaterial(0x2d4870);
    const bootMat = makeFeltMaterial(0x69462d);
    const coneOrange = makeFeltMaterial(0xf07822);
    const coneWhite = makeFeltMaterial(0xf5f2ea);
    const tieMat = makeFeltMaterial(0xb44f7c, {
      map: getPolkaPatternTex('partin_tie', '#b34b78', '#f5e8dc', 12, 48),
    });

    // Chubby round belly + dirty button shirt
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.49, 18, 16), skinMat);
    belly.scale.set(1.08, 0.9, 0.94);
    belly.position.y = 0.78;
    belly.castShadow = true;
    body.add(belly);

    const shirt = new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.54, 0.52, 16), shirtMat);
    shirt.position.y = 0.94;
    shirt.castShadow = true;
    body.add(shirt);
    addPatch(body, -0.26, 0.9, 0.4, 0x3ba9de, 0.1, 0.13, -0.4);

    // Polka-dot magenta tie!
    const tieKnot = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.1, 0.1), tieMat);
    tieKnot.position.set(0, 1.14, 0.42);
    body.add(tieKnot);
    const tieBlade = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.4, 4), tieMat);
    tieBlade.rotation.set(Math.PI - 0.18, Math.PI / 4, 0);
    tieBlade.scale.set(1, 1, 0.35);
    tieBlade.position.set(0, 0.91, 0.49);
    body.add(tieBlade);

    const pants = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.38, 0.24, 16), pantsMat);
    pants.position.y = 0.5;
    body.add(pants);

    head.position.set(0, 1.56, 0);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.44, 18, 16), skinMat);
    skull.scale.set(1.04, 0.96, 0.98);
    skull.castShadow = true;
    head.add(skull);
    addFeltEars(head, skinMat, 0.44, 0.0, 0.085);
    addZombieFace(head, {
      zOffset: 0.4,
      eyeScale: 1.02,
      eyeSpacing: 0.17,
      leftIrisColor: 0x241d18,
      mouthWidth: 0.36,
      mouthOpen: 0.14,
      cheekColor: 0x70c7d9,
    });

    // Traffic cone tilted on right side of head
    const coneGrp = new THREE.Group();
    coneGrp.position.set(0.12, 0.38, 0);
    coneGrp.rotation.z = -0.22;
    const coneRim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.06, 16), coneOrange);
    coneGrp.add(coneRim);
    const coneTop = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.56, 16), coneOrange);
    coneTop.position.y = 0.28;
    coneTop.castShadow = true;
    coneGrp.add(coneTop);
    const coneStripe = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.19, 0.15, 16), coneWhite);
    coneStripe.position.y = 0.27;
    coneGrp.add(coneStripe);
    head.add(coneGrp);
    body.add(head);

    addDetailedLimbs(body, leftArm, rightArm, leftLeg, rightLeg, skinMat, skinMat, pantsMat, skinMat, {
      armX: 0.54,
      armY: 1.08,
      armLen: 0.34,
      armRad: 0.1,
      legX: 0.22,
      legY: 0.44,
      legLen: 0.26,
      legRad: 0.13,
      sleeveMat: shirtMat,
      leftFootMat: bootMat,
      rightFootMat: skinMat,
      leftShoe: true,
      rightShoe: false,
      peaceHands: true,
    });
  } else if (charId === 'green_glassy') {
    const skinMat = makeFeltMaterial(0x88b36a);
    const shirtMat = makeFeltMaterial(0xe3d8c4);
    const pantsMat = makeFeltMaterial(0x5c422c);
    const shoeMat = makeFeltMaterial(0x63442a);
    const glassesMat = new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.35 });
    const tapeMat = makeFeltMaterial(0xf5f3ed);
    const bookCoverMat = makeFeltMaterial(0xebd04b, { map: getBookCoverTex() });
    const pagesMat = makeFeltMaterial(0xf5f0e1);
    const chickenMat = makeFeltMaterial(0xf5b82e);
    const combMat = makeFeltMaterial(0xd63c35);

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.56, 16), shirtMat);
    torso.position.y = 0.78;
    torso.castShadow = true;
    body.add(torso);

    // Big round zombie head with purple bruise
    head.position.set(0, 1.48, 0);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.49, 18, 16), skinMat);
    skull.castShadow = true;
    head.add(skull);
    addPatch(head, -0.22, 0.28, 0.36, 0x735970, 0.12, 0.1);
    addFeltEars(head, skinMat, 0.49, 0.0, 0.095);
    addZombieFace(head, {
      zOffset: 0.44,
      eyeScale: 1.08,
      eyeSpacing: 0.2,
      leftIrisColor: 0x241d18,
      mouthWidth: 0.32,
      mouthOpen: 0.13,
    });

    // Big round black glasses + white nose tape!
    [-0.2, 0.2].forEach((gx) => {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.032, 10, 22), glassesMat);
      rim.position.set(gx, 0.06, 0.47);
      head.add(rim);
    });
    const tape = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.045, 0.045), tapeMat);
    tape.position.set(0, 0.06, 0.48);
    head.add(tape);
    body.add(head);

    addDetailedLimbs(body, leftArm, rightArm, leftLeg, rightLeg, skinMat, skinMat, pantsMat, shoeMat, {
      armX: 0.39,
      armY: 0.94,
      armLen: 0.3,
      armRad: 0.085,
      legX: 0.17,
      legY: 0.44,
      legLen: 0.26,
      legRad: 0.12,
      leftShoe: true,
      rightShoe: true,
    });
    addPatch(leftLeg, 0, -0.14, 0.11, 0x4b93b3, 0.09, 0.08);

    // Open "ZOMBIE COMPENDIUM" book held in front!
    const bookGrp = new THREE.Group();
    bookGrp.position.set(-0.04, 0.85, 0.48);
    bookGrp.rotation.x = -0.35;
    const coverL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.38, 0.04), bookCoverMat);
    coverL.position.set(-0.15, 0, 0);
    coverL.rotation.y = 0.32;
    bookGrp.add(coverL);
    const coverR = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.38, 0.04), bookCoverMat);
    coverR.position.set(0.15, 0, 0);
    coverR.rotation.y = -0.32;
    bookGrp.add(coverR);
    const pages = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.34, 0.07), pagesMat);
    pages.position.set(0, 0.01, -0.04);
    bookGrp.add(pages);
    body.add(bookGrp);

    // Rubber chicken tucked under right arm (+X)!
    const chicken = new THREE.Group();
    chicken.position.set(0.42, 0.72, 0.15);
    const cBody = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), chickenMat);
    cBody.scale.set(0.85, 1.35, 0.85);
    chicken.add(cBody);
    const cNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.26, 10), chickenMat);
    cNeck.position.y = 0.24;
    chicken.add(cNeck);
    const cHead = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), chickenMat);
    cHead.position.y = 0.39;
    chicken.add(cHead);
    const comb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), combMat);
    comb.scale.set(0.7, 1.2, 1.2);
    comb.position.set(0, 0.47, 0);
    chicken.add(comb);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.09, 6), combMat);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.38, 0.09);
    chicken.add(beak);
    [-0.05, 0.05].forEach((lx) => {
      const cLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.22, 6), makeFeltMaterial(0xd96b27));
      cLeg.position.set(lx, -0.22, 0);
      chicken.add(cLeg);
    });
    body.add(chicken);
  } else if (charId === 'purple_chef') {
    const skinMat = makeFeltMaterial(0x7c4aa8, {
      map: getCorduroyPatternTex('chef_cord', '#7b4aa8', '#62368a'),
    });
    const tankMat = makeFeltMaterial(0xeae2d2);
    const apronMat = makeFeltMaterial(0x478a4e);
    const hatMat = makeFeltMaterial(0xf2ece0);
    const butterMat = new THREE.MeshStandardMaterial({ color: 0xe3b82b, roughness: 0.25 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0xd0d8e2, metalness: 0.78, roughness: 0.25 });
    const breadCrustMat = makeFeltMaterial(0x5e3418);
    const breadCrumbMat = makeFeltMaterial(0xe6c79c, {
      map: getBrainTex('#e6c79c', '#9c6838'),
    });

    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.35, 0.38, 14), tankMat);
    chest.position.y = 0.96;
    body.add(chest);
    const apron = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.44, 0.46, 14), apronMat);
    apron.position.y = 0.68;
    apron.castShadow = true;
    body.add(apron);
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.06), apronMat);
    pocket.position.set(0, 0.68, 0.39);
    body.add(pocket);

    // Square corduroy head!
    head.position.set(0, 1.5, 0);
    const boxHead = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.64, 0.64), skinMat);
    boxHead.castShadow = true;
    head.add(boxHead);
    addFeltEars(head, skinMat, 0.42, 0.0, 0.09);
    addZombieFace(head, {
      zOffset: 0.32,
      eyeScale: 1.05,
      eyeSpacing: 0.18,
      leftIrisColor: 0x5c8a47,
      eyeRimColor: 0x9b6bc7,
      mouthWidth: 0.38,
      mouthOpen: 0.13,
      cheekColor: 0xd49635,
      stitches: false,
    });

    // Chef toque hat + dripping butter!
    const hatGrp = new THREE.Group();
    hatGrp.position.set(0.12, 0.34, 0);
    hatGrp.rotation.z = -0.18;
    const hatBand = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.21, 0.26, 14), hatMat);
    hatBand.position.y = 0.12;
    hatGrp.add(hatBand);
    const hatPuff = new THREE.Mesh(new THREE.SphereGeometry(0.29, 14, 12), hatMat);
    hatPuff.scale.set(1.15, 0.78, 1.05);
    hatPuff.position.y = 0.32;
    hatPuff.castShadow = true;
    hatGrp.add(hatPuff);
    const drip = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), butterMat);
    drip.scale.set(1.3, 0.7, 1);
    drip.position.set(0.08, 0.02, 0.2);
    hatGrp.add(drip);
    head.add(hatGrp);
    body.add(head);

    addDetailedLimbs(body, leftArm, rightArm, leftLeg, rightLeg, metalMat, skinMat, skinMat, skinMat, {
      armX: 0.42,
      armY: 1.08,
      armLen: 0.38,
      legX: 0.17,
      legY: 0.46,
      legLen: 0.28,
      springArms: true,
    });

    // Wire whisk in left arm (-X)
    const whiskGrp = new THREE.Group();
    whiskGrp.position.set(0, -0.46, 0.16);
    whiskGrp.rotation.x = 0.35;
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.2, 8), metalMat);
    whiskGrp.add(handle);
    for (let w = 0; w < 3; w++) {
      const wire = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.01, 6, 16), metalMat);
      wire.scale.set(0.72, 1.5, 1);
      wire.position.y = 0.22;
      wire.rotation.y = (w / 3) * Math.PI;
      whiskGrp.add(wire);
    }
    leftArm.add(whiskGrp);

    // Loaf of toasted bread in right arm (+X)
    const loafGrp = new THREE.Group();
    loafGrp.position.set(0, -0.38, 0.22);
    const loaf = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.28, 0.3), breadCrustMat);
    loafGrp.add(loaf);
    const sliceFace = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.24), breadCrumbMat);
    sliceFace.position.z = 0.155;
    loafGrp.add(sliceFace);
    rightArm.add(loafGrp);
  } else if (charId === 'orange_cheney') {
    const skinMat = makeFeltMaterial(0xe8782c);
    const capMat = makeFeltMaterial(0x468a4d);
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd24c, metalness: 0.78, roughness: 0.22 });
    const boneMat = makeFeltMaterial(0xf2e9d8);
    const batMat = makeFeltMaterial(0xc29362);
    const brainMat = makeFeltMaterial(0x95b865, {
      map: getBrainTex('#95b865', '#4c662e'),
    });

    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.49, 18, 16), skinMat);
    torso.scale.set(1.06, 0.94, 0.95);
    torso.position.y = 0.84;
    torso.castShadow = true;
    body.add(torso);
    addPatch(body, -0.34, 0.84, 0.28, 0xa84718, 0.11, 0.11);
    addPatch(body, 0.3, 0.72, 0.34, 0xa84718, 0.09, 0.09);

    // Thick gold chain + white bone pendant!
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.042, 8, 18), goldMat);
    chain.rotation.x = Math.PI / 2.2;
    chain.position.set(0, 1.15, 0.16);
    body.add(chain);
    const boneBar = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.22, 8), boneMat);
    boneBar.rotation.z = Math.PI / 2;
    boneBar.position.set(0, 1.02, 0.44);
    body.add(boneBar);
    [-0.1, 0.1].forEach((bx) => {
      [-0.025, 0.025].forEach((by) => {
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.038, 7, 7), boneMat);
        knob.position.set(bx, 1.02 + by, 0.44);
        body.add(knob);
      });
    });

    head.position.set(0, 1.5, 0);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.44, 18, 16), skinMat);
    skull.castShadow = true;
    head.add(skull);
    addFeltEars(head, skinMat, 0.44, 0.0, 0.09);
    addZombieFace(head, {
      zOffset: 0.4,
      eyeScale: 1.04,
      eyeSpacing: 0.17,
      leftIrisColor: 0x452b1a,
      rightIrisColor: 0x4c7a74,
      mouthWidth: 0.36,
      mouthOpen: 0.13,
      browColor: 0x6e3112,
    });

    // Tilted green baseball cap
    const capGrp = new THREE.Group();
    capGrp.position.set(-0.05, 0.22, 0);
    capGrp.rotation.z = 0.22;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.37, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), capMat);
    capGrp.add(cap);
    const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 12, 1, false, -1.1, 2.2), capMat);
    visor.position.set(-0.04, 0.02, 0.24);
    capGrp.add(visor);
    head.add(capGrp);
    body.add(head);

    addDetailedLimbs(body, leftArm, rightArm, leftLeg, rightLeg, skinMat, skinMat, skinMat, skinMat, {
      armX: 0.5,
      armY: 1.02,
      armLen: 0.36,
      armRad: 0.095,
      legX: 0.19,
      legY: 0.44,
      legLen: 0.28,
      legRad: 0.115,
    });

    // Broken wooden bat in left arm (-X)
    const bat = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.045, 0.68, 10), batMat);
    bat.position.set(0, -0.3, 0.22);
    bat.rotation.x = -0.55;
    leftArm.add(bat);

    // Textured brain ball in right arm (+X)
    const brain = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), brainMat);
    brain.position.set(0, -0.32, 0.24);
    rightArm.add(brain);
  } else if (charId === 'yellow_stripes') {
    const skinMat = makeFeltMaterial(0xedd047);
    const stripeMat = makeFeltMaterial(0xffffff, {
      map: getStripePatternTex('prison_stripes', '#f2ece0', '#24242b', 22),
    });
    const bucketMat = new THREE.MeshStandardMaterial({ color: 0x997f6e, metalness: 0.55, roughness: 0.5 });
    const stickMat = makeFeltMaterial(0xe3d1af);
    const malletMat = makeFeltMaterial(0xb3383e);

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.29, 0.8, 14), stripeMat);
    torso.position.y = 0.98;
    torso.castShadow = true;
    body.add(torso);
    addButton(body, -0.09, 1.05, 0.27, 0x5eb86e, 0.05);
    addPatch(body, 0.1, 1.15, 0.26, 0x3b689c, 0.11, 0.06);
    addPatch(body, 0.04, 0.72, 0.28, 0xedd047, 0.14, 0.12);

    head.position.set(0, 1.66, 0);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.38, 18, 16), skinMat);
    skull.castShadow = true;
    head.add(skull);
    addFeltEars(head, skinMat, 0.38, 0.0, 0.085);
    addZombieFace(head, {
      zOffset: 0.34,
      eyeScale: 1.08,
      eyeSpacing: 0.17,
      leftIrisColor: 0xb8373e,
      eyeRimColor: 0xe3dcce,
      mouthWidth: 0.32,
      mouthOpen: 0.13,
      browColor: 0x5c4616,
    });

    // Rusty bucket with wire handle tilted on head!
    const bucketGrp = new THREE.Group();
    bucketGrp.position.set(0.14, 0.44, 0);
    bucketGrp.rotation.z = -0.24;
    const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.36, 14), bucketMat);
    bucket.castShadow = true;
    bucketGrp.add(bucket);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.015, 6, 16, Math.PI), bucketMat);
    handle.rotation.z = Math.PI;
    handle.position.y = -0.14;
    bucketGrp.add(handle);
    head.add(bucketGrp);
    body.add(head);

    addDetailedLimbs(body, leftArm, rightArm, leftLeg, rightLeg, skinMat, skinMat, stripeMat, skinMat, {
      armX: 0.34,
      armY: 1.24,
      armLen: 0.48,
      armRad: 0.068,
      legX: 0.14,
      legY: 0.56,
      legLen: 0.4,
      legRad: 0.09,
    });
    addPatch(leftLeg, 0, -0.2, 0.09, 0xedd047, 0.08, 0.09);
    addPatch(rightLeg, 0, -0.2, 0.09, 0xedd047, 0.08, 0.09);

    [leftArm, rightArm].forEach((arm, idx) => {
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.55, 8), stickMat);
      stick.position.set(0, -0.44, 0.2);
      stick.rotation.x = Math.PI / 2.3;
      arm.add(stick);
      if (idx === 1) {
        const mallet = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), malletMat);
        mallet.position.set(0, -0.34, 0.44);
        arm.add(mallet);
      }
    });
  } else if (charId === 'polka_pippin') {
    const skinMat = makeFeltMaterial(0x88c440);
    const dressMat = makeFeltMaterial(0xffffff, {
      map: getPolkaPatternTex('pippin_dress', '#baa582', '#c43b3b', 16, 60),
    });
    const collarMat = makeFeltMaterial(0xf5f0e2);
    const hatMat = makeFeltMaterial(0xffffff, {
      map: getPolkaPatternTex('pippin_hat', '#e06b4c', '#3d7ec2', 16, 56),
    });
    const pomMat = makeFeltMaterial(0x6e478a);
    const eyeBallMat = makeFeltMaterial(0xf7f5eb);

    const torso = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.72, 16), dressMat);
    torso.position.y = 0.74;
    torso.castShadow = true;
    body.add(torso);
    // White Peter Pan collar + button
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.08, 14), collarMat);
    collar.position.y = 1.07;
    body.add(collar);
    addButton(body, 0, 1.03, 0.25, 0xf7f5ee, 0.04);

    head.position.set(0, 1.4, 0);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.44, 18, 16), skinMat);
    skull.castShadow = true;
    head.add(skull);
    addFeltEars(head, skinMat, 0.44, -0.02, 0.085);
    addZombieFace(head, {
      zOffset: 0.4,
      eyeScale: 1.08,
      eyeSpacing: 0.18,
      leftIrisColor: 0xc2483e,
      eyeRimColor: 0x739c36,
      mouthWidth: 0.33,
      mouthOpen: 0.13,
      cheekColor: 0x856648,
      browColor: 0x456324,
    });

    const partyHat = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.44, 14), hatMat);
    partyHat.position.y = 0.56;
    partyHat.castShadow = true;
    head.add(partyHat);
    const pom = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), pomMat);
    pom.position.y = 0.8;
    head.add(pom);
    body.add(head);

    addDetailedLimbs(body, leftArm, rightArm, leftLeg, rightLeg, skinMat, skinMat, skinMat, skinMat, {
      armX: 0.38,
      armY: 0.94,
      armLen: 0.32,
      armRad: 0.08,
      legX: 0.15,
      legY: 0.42,
      legLen: 0.26,
      legRad: 0.1,
    });

    // Red & Blue eyeball juggling spheres on hands!
    [leftArm, rightArm].forEach((arm, idx) => {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), eyeBallMat);
      ball.position.set(0, -0.34, 0.2);
      arm.add(ball);
      const iris = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 8, 8),
        new THREE.MeshStandardMaterial({ color: idx === 0 ? 0xd13f3f : 0x3282c9 })
      );
      iris.position.set(0, -0.34, 0.31);
      arm.add(iris);
    });
  } else if (charId === 'mummy_wrapple') {
    const skinMat = makeFeltMaterial(0xc988a5);
    const wrapMat = makeFeltMaterial(0xe6dcc5);
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x3f434a, metalness: 0.72, roughness: 0.4 });
    const lanternGlowMat = new THREE.MeshStandardMaterial({ color: 0xffe488, emissive: 0xffb329, emissiveIntensity: 1.8 });

    // Slightly floating body!
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.31, 0.44, 8, 14), skinMat);
    torso.position.y = 0.98;
    torso.castShadow = true;
    body.add(torso);
    for (let w = 0; w < 5; w++) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.042, 7, 18), wrapMat);
      band.rotation.set(Math.PI / 2 + (w % 2 === 0 ? 0.22 : -0.22), 0, 0);
      band.position.y = 0.76 + w * 0.1;
      body.add(band);
    }

    head.position.set(0, 1.58, 0);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 16), skinMat);
    skull.castShadow = true;
    head.add(skull);
    addFeltEars(head, skinMat, 0.42, 0.0, 0.085);
    // Criss-cross mummy head bandages above & below eyes
    [0.24, 0.3, -0.24].forEach((by, idx) => {
      const band = new THREE.Mesh(new THREE.TorusGeometry(idx === 1 ? 0.34 : 0.39, 0.045, 7, 18), wrapMat);
      band.rotation.set(Math.PI / 2 + (idx - 1) * 0.25, 0, 0);
      band.position.y = by;
      head.add(band);
    });
    addZombieFace(head, {
      zOffset: 0.39,
      eyeScale: 1.06,
      eyeSpacing: 0.17,
      leftIrisColor: 0xc28a38,
      eyeRimColor: 0x9c6896,
      mouthWidth: 0.26,
      mouthOpen: 0.09,
      stitches: false,
    });
    body.add(head);

    addDetailedLimbs(body, leftArm, rightArm, leftLeg, rightLeg, skinMat, skinMat, skinMat, skinMat, {
      armX: 0.39,
      armY: 1.12,
      armLen: 0.38,
      armRad: 0.08,
      legX: 0.15,
      legY: 0.58,
      legLen: 0.3,
      legRad: 0.09,
      bandageMat: wrapMat,
    });

    // Detailed antique lantern in right arm (+X)
    const lanternGrp = new THREE.Group();
    lanternGrp.position.set(0, -0.52, 0.18);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.015, 6, 12), metalMat);
    ring.position.y = 0.22;
    lanternGrp.add(ring);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.12, 10), metalMat);
    roof.position.y = 0.12;
    lanternGrp.add(roof);
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.2, 10), lanternGlowMat);
    lanternGrp.add(glass);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.06, 10), metalMat);
    base.position.y = -0.12;
    lanternGrp.add(base);
    rightArm.add(lanternGrp);
  } else if (charId === 'green_prof') {
    const skinMat = makeFeltMaterial(0x889c7c);
    const coatMat = makeFeltMaterial(0xe3dbc8);
    const pantsMat = makeFeltMaterial(0xffffff, {
      map: getStripePatternTex('prof_pants', '#444642', '#2b2d2a', 14),
    });
    const glassesMat = new THREE.MeshStandardMaterial({ color: 0x25262c, roughness: 0.35 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xdff7ed,
      transparent: true,
      opacity: 0.45,
      roughness: 0.12,
      metalness: 0.1,
    });
    const acidMat = new THREE.MeshStandardMaterial({ color: 0x45f07d, emissive: 0x20aa4d, emissiveIntensity: 1.25 });

    // Lab coat + inner shirt + stains + 2 buttons
    const shirt = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.5, 12), skinMat);
    shirt.position.y = 1.05;
    body.add(shirt);
    const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.44, 0.94, 14), coatMat);
    coat.position.y = 0.86;
    coat.castShadow = true;
    body.add(coat);
    addButton(body, 0, 0.94, 0.34, 0x5c4e3e, 0.045);
    addButton(body, 0, 0.81, 0.36, 0x5c4e3e, 0.045);
    addPatch(body, -0.18, 0.72, 0.36, 0x99795a, 0.14, 0.14, -0.35);

    head.position.set(0, 1.62, 0);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.39, 18, 16), skinMat);
    skull.castShadow = true;
    head.add(skull);
    addFeltEars(head, skinMat, 0.39, -0.02, 0.085);
    addZombieFace(head, {
      zOffset: 0.35,
      eyeScale: 1.02,
      eyeSpacing: 0.16,
      leftIrisColor: 0xa67c37,
      mouthWidth: 0.3,
      mouthOpen: 0.12,
    });
    [-0.16, 0.16].forEach((gx) => {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.028, 8, 18), glassesMat);
      rim.position.set(gx, 0.06, 0.39);
      head.add(rim);
    });
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.025), glassesMat);
    bridge.position.set(0, 0.07, 0.4);
    head.add(bridge);
    body.add(head);

    addDetailedLimbs(body, leftArm, rightArm, leftLeg, rightLeg, coatMat, skinMat, pantsMat, skinMat, {
      armX: 0.36,
      armY: 1.22,
      armLen: 0.44,
      armRad: 0.075,
      legX: 0.15,
      legY: 0.54,
      legLen: 0.38,
      legRad: 0.088,
    });
    addPatch(leftLeg, 0, -0.16, 0.085, 0xb85239, 0.07, 0.08);
    addPatch(rightLeg, 0, -0.22, 0.085, 0xb85239, 0.07, 0.08);

    // Long-neck round bottom glass flask with glowing green liquid in right arm (+X)
    const flaskGrp = new THREE.Group();
    flaskGrp.position.set(0, -0.46, 0.18);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), glassMat);
    flaskGrp.add(bulb);
    const liquid = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), acidMat);
    liquid.scale.y = 0.72;
    liquid.position.y = -0.025;
    flaskGrp.add(liquid);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.24, 10), glassMat);
    neck.position.y = 0.2;
    flaskGrp.add(neck);
    rightArm.add(flaskGrp);
  } else if (charId === 'scarf_miina') {
    const skinMat = makeFeltMaterial(0x69a7b8);
    const hairMat = makeFeltMaterial(0x7c459c);
    const dressMat = makeFeltMaterial(0xffffff, {
      map: getPolkaPatternTex('miina_dress', '#c93b3b', '#f7efe3', 14, 54),
    });
    const bearMat = makeFeltMaterial(0x9c6b42);
    const snoutMat = makeFeltMaterial(0xe3cbb1);

    const torso = new THREE.Mesh(new THREE.ConeGeometry(0.41, 0.74, 16), dressMat);
    torso.position.y = 0.74;
    torso.castShadow = true;
    body.add(torso);

    head.position.set(0, 1.4, 0);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 16), skinMat);
    skull.castShadow = true;
    head.add(skull);
    addFeltEars(head, skinMat, 0.42, -0.02, 0.085);

    // Sculpted purple bob hair strands!
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56), hairMat);
    crown.position.y = 0.04;
    head.add(crown);
    const backHair = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.48, 0.52, 14, 1, false, Math.PI * 0.65, Math.PI * 0.7), hairMat);
    backHair.position.set(0, -0.14, -0.02);
    head.add(backHair);
    for (let s = 0; s < 5; s++) {
      const ang = -1.2 + s * 0.6;
      const strand = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.42, 5, 8), hairMat);
      strand.position.set(Math.sin(ang) * 0.42, -0.1, Math.cos(ang) * -0.12);
      strand.rotation.z = ang * 0.14;
      head.add(strand);
    }

    addZombieFace(head, {
      zOffset: 0.38,
      eyeScale: 1.05,
      eyeSpacing: 0.17,
      leftIrisColor: 0x73521e,
      rightIrisColor: 0xc29346,
      eyeRimColor: 0x9aa4b0,
      mouthWidth: 0.3,
      mouthOpen: 0.11,
      cheekColor: 0x8c6368,
      browColor: 0x5c2f7a,
    });
    body.add(head);

    addDetailedLimbs(body, leftArm, rightArm, leftLeg, rightLeg, skinMat, skinMat, skinMat, skinMat, {
      armX: 0.36,
      armY: 0.96,
      armLen: 0.32,
      armRad: 0.075,
      legX: 0.15,
      legY: 0.42,
      legLen: 0.26,
      legRad: 0.095,
    });

    // Cute Teddy Bear hugged on chest with Orange & Blue button eyes!
    const bear = new THREE.Group();
    bear.position.set(0, 0.76, 0.42);
    bear.rotation.z = -0.15;
    const bBody = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), bearMat);
    bBody.scale.set(0.9, 1.15, 0.8);
    bear.add(bBody);
    const bHead = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 12), bearMat);
    bHead.position.y = 0.24;
    bear.add(bHead);
    [-0.14, 0.14].forEach((ex) => {
      const bEar = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), bearMat);
      bEar.position.set(ex, 0.37, 0);
      bear.add(bEar);
    });
    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), snoutMat);
    snout.position.set(0, 0.21, 0.14);
    bear.add(snout);
    addButton(bear, -0.065, 0.27, 0.15, 0xed823b, 0.042);
    addButton(bear, 0.065, 0.27, 0.15, 0x3b86c9, 0.042);
    [-0.14, 0.14].forEach((lx) => {
      const bLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.12, 4, 8), bearMat);
      bLeg.position.set(lx, -0.18, 0.05);
      bear.add(bLeg);
    });
    body.add(bear);
  } else if (charId === 'brains_blossom') {
    const skinMat = makeFeltMaterial(0xe87898);
    const bibMat = makeFeltMaterial(0xf7efe3, { map: getBibTex() });
    const hatMat = makeFeltMaterial(0xd996c2);
    const frillMat = makeFeltMaterial(0xa85f93);
    const cupMat = makeFeltMaterial(0x633b22);
    const brainIcingMat = makeFeltMaterial(0xeba1b4, {
      map: getBrainTex('#eba1b4', '#b0566e'),
    });

    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.47, 18, 16), skinMat);
    torso.scale.set(1.06, 0.96, 0.96);
    torso.position.y = 0.82;
    torso.castShadow = true;
    body.add(torso);

    // "BRAINS" lace bib!
    const bib = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.44, 0.38, 14, 1, false, -0.8, 1.6), bibMat);
    bib.position.set(0, 0.96, 0.12);
    body.add(bib);

    head.position.set(0, 1.48, 0);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.43, 18, 16), skinMat);
    skull.castShadow = true;
    head.add(skull);
    addFeltEars(head, skinMat, 0.43, 0.0, 0.085);
    addZombieFace(head, {
      zOffset: 0.39,
      eyeScale: 1.0,
      eyeSpacing: 0.17,
      leftIrisColor: 0x3b7843,
      rightIrisColor: 0xc24868,
      mouthWidth: 0.3,
      mouthOpen: 0.1,
      cheekColor: 0xd96678,
      browColor: 0x9c3e59,
    });

    const partyHat = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.45, 14), hatMat);
    partyHat.position.y = 0.56;
    partyHat.castShadow = true;
    head.add(partyHat);
    const hatFrill = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.035, 8, 16), frillMat);
    hatFrill.rotation.x = Math.PI / 2;
    hatFrill.position.y = 0.36;
    head.add(hatFrill);
    const tassel = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), hatMat);
    tassel.position.y = 0.8;
    head.add(tassel);
    body.add(head);

    addDetailedLimbs(body, leftArm, rightArm, leftLeg, rightLeg, skinMat, skinMat, skinMat, skinMat, {
      armX: 0.46,
      armY: 0.98,
      armLen: 0.32,
      armRad: 0.088,
      legX: 0.18,
      legY: 0.44,
      legLen: 0.26,
      legRad: 0.11,
    });

    // Brain-iced cupcake in right arm (+X)
    const cakeGrp = new THREE.Group();
    cakeGrp.position.set(0, -0.34, 0.22);
    const wrapper = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.16, 12), cupMat);
    cakeGrp.add(wrapper);
    const icing = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), brainIcingMat);
    icing.scale.y = 0.78;
    icing.position.y = 0.11;
    cakeGrp.add(icing);
    rightArm.add(cakeGrp);
  } else {
    // captain_patch (playable & Stage 1 Boss!)
    const skinMat = makeFeltMaterial(0x3ca7d4);
    const coatMat = makeFeltMaterial(0x6e3a94);
    const shirtMat = makeFeltMaterial(0xefeae0);
    const pantsMat = makeFeltMaterial(0xffffff, {
      map: getStripePatternTex('patch_pants', '#52514d', '#333230', 14),
    });
    const hatMat = makeFeltMaterial(0x1f1e28);
    const rabbitMat = makeFeltMaterial(0xf7f2ea);
    const pinkEarMat = makeFeltMaterial(0xe89ca8);
    const wandMat = makeFeltMaterial(0x2d2424);

    // Shirt & tie + purple tailcoat with lapel collar!
    const shirt = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.24, 0.48, 12), shirtMat);
    shirt.position.y = 1.05;
    body.add(shirt);
    const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.46, 0.96, 14), coatMat);
    coat.position.y = 0.86;
    coat.castShadow = true;
    body.add(coat);
    // Pointy magician lapels
    [-0.17, 0.17].forEach((lx) => {
      const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.14), coatMat);
      lapel.position.set(lx, 1.24, 0.12);
      lapel.rotation.z = lx < 0 ? 0.25 : -0.25;
      body.add(lapel);
    });
    addPatch(body, 0.16, 1.1, 0.28, 0xc95534, 0.08, 0.09);

    head.position.set(0, 1.58, 0);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.4, 18, 16), skinMat);
    skull.castShadow = true;
    head.add(skull);
    addFeltEars(head, skinMat, 0.4, -0.02, 0.085);
    addZombieFace(head, {
      zOffset: 0.36,
      eyeScale: 1.04,
      eyeSpacing: 0.17,
      leftIrisColor: 0x628c6e,
      eyeRimColor: 0x1b1d22,
      mouthWidth: 0.34,
      mouthOpen: 0.12,
      eyepatchRight: true,
    });

    // Top hat with purple band tilted left (-X)
    const hatGrp = new THREE.Group();
    hatGrp.position.set(-0.14, 0.34, 0);
    hatGrp.rotation.z = 0.22;
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.045, 16), hatMat);
    hatGrp.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.21, 0.44, 16), hatMat);
    crown.position.y = 0.22;
    crown.castShadow = true;
    hatGrp.add(crown);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.22, 0.09, 16), coatMat);
    band.position.y = 0.08;
    hatGrp.add(band);
    head.add(hatGrp);

    // White rabbit perched on right side of hat (+X)!
    const rabbit = new THREE.Group();
    rabbit.position.set(0.18, 0.44, 0.04);
    const rBody = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), rabbitMat);
    rabbit.add(rBody);
    const rHead = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), rabbitMat);
    rHead.position.y = 0.18;
    rabbit.add(rHead);
    [-0.06, 0.06].forEach((rx, idx) => {
      const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.036, 0.22, 4, 8), rabbitMat);
      ear.position.set(rx, 0.36, 0);
      ear.rotation.z = idx === 0 ? 0.12 : -0.36;
      rabbit.add(ear);
      const earIn = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.16, 4, 6), pinkEarMat);
      earIn.position.set(rx, 0.36, 0.025);
      earIn.rotation.z = ear.rotation.z;
      rabbit.add(earIn);
    });
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.024, 6, 6), pinkEarMat);
    nose.position.set(0, 0.17, 0.13);
    rabbit.add(nose);
    [-0.045, 0.045].forEach((ex) => {
      const rEye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6), new THREE.MeshStandardMaterial({ color: 0x3b4d2a }));
      rEye.position.set(ex, 0.21, 0.11);
      rabbit.add(rEye);
    });
    head.add(rabbit);
    body.add(head);

    addDetailedLimbs(body, leftArm, rightArm, leftLeg, rightLeg, coatMat, skinMat, pantsMat, skinMat, {
      armX: 0.36,
      armY: 1.2,
      armLen: 0.44,
      armRad: 0.075,
      legX: 0.15,
      legY: 0.54,
      legLen: 0.38,
      legRad: 0.085,
    });
    addPatch(leftLeg, 0, -0.18, 0.085, 0xc95534, 0.07, 0.07);

    // Magic wand in right arm (+X)
    const wand = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.028, 0.58, 8), wandMat);
    wand.position.set(0, -0.34, 0.25);
    wand.rotation.x = Math.PI / 3;
    rightArm.add(wand);
  }

  return { root, body, head, leftArm, rightArm, leftLeg, rightLeg };
}

export type EnemyKind = 'scissor' | 'crow' | 'vacuum' | 'boss';

export function buildEnemyPuppet(
  kind: EnemyKind,
  bossCharId = 'captain_patch'
): { root: THREE.Group; animPart: THREE.Object3D; animPart2?: THREE.Object3D } {
  if (kind === 'boss') {
    const rig = buildPlayablePuppet(bossCharId);
    rig.root.scale.setScalar(2.15);
    const aura = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 1.08, 32),
      new THREE.MeshBasicMaterial({ color: 0xff4fd8, side: THREE.DoubleSide, transparent: true, opacity: 0.75 })
    );
    aura.rotation.x = -Math.PI / 2;
    aura.position.y = 0.06;
    rig.root.add(aura);
    return { root: rig.root, animPart: rig.head, animPart2: rig.body };
  }

  const root = new THREE.Group();
  root.add(makeShadowBlob());

  if (kind === 'scissor') {
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xd0d7e3, metalness: 0.78, roughness: 0.26 });
    const handleMat = makeFeltMaterial(0xd93838);
    const eyeMat = makeFeltMaterial(0xf8f2d8);
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x16161d });

    const pivot = new THREE.Group();
    pivot.position.y = 1.05;

    const bladeL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.1, 0.08), bladeMat);
    bladeL.position.set(-0.18, 0.32, 0);
    bladeL.rotation.z = 0.24;
    bladeL.castShadow = true;
    pivot.add(bladeL);

    const bladeR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.1, 0.08), bladeMat);
    bladeR.position.set(0.18, 0.32, 0);
    bladeR.rotation.z = -0.24;
    bladeR.castShadow = true;
    pivot.add(bladeR);

    [-0.24, 0.24].forEach((hx) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.065, 8, 16), handleMat);
      ring.position.set(hx, -0.35, 0);
      pivot.add(ring);
    });

    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), eyeMat);
    eye.position.set(0, 0.05, 0.1);
    pivot.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), pupilMat);
    pupil.position.set(0, 0.05, 0.23);
    pivot.add(pupil);

    root.add(pivot);
    return { root, animPart: bladeL, animPart2: bladeR };
  }

  if (kind === 'crow') {
    const featherMat = makeFeltMaterial(0x282936);
    const bellyMat = makeFeltMaterial(0x414357);
    const beakMat = makeFeltMaterial(0xebb334);
    const eyeMat = makeFeltMaterial(0xf7f1d5);
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x16161d });

    const body = new THREE.Group();
    body.position.y = 1.35;

    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.38, 14, 12), featherMat);
    torso.scale.set(0.9, 0.9, 1.3);
    torso.castShadow = true;
    body.add(torso);

    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 10), bellyMat);
    chest.position.set(0, -0.06, 0.16);
    body.add(chest);

    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.42, 8), beakMat);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.04, 0.56);
    body.add(beak);

    [-0.14, 0.14].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 10), eyeMat);
      eye.position.set(ex, 0.14, 0.34);
      body.add(eye);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), pupilMat);
      pupil.position.set(ex, 0.14, 0.42);
      body.add(pupil);
    });

    const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.08, 0.36), featherMat);
    wingL.position.set(-0.48, 0.06, 0);
    body.add(wingL);

    const wingR = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.08, 0.36), featherMat);
    wingR.position.set(0.48, 0.06, 0);
    body.add(wingR);

    root.add(body);
    return { root, animPart: wingL, animPart2: wingR };
  }

  // Vacuum cleaner
  const metalMat = makeFeltMaterial(0x7c8699);
  const hoseMat = makeFeltMaterial(0x3a3f4d);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff4c65, emissive: 0xd92638, emissiveIntensity: 0.95 });

  const body = new THREE.Group();
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.48, 0.85, 14), metalMat);
  drum.position.y = 0.6;
  drum.castShadow = true;
  body.add(drum);

  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.44, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), hoseMat);
  cap.position.y = 1.02;
  body.add(cap);

  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.18, 0.52, 10), hoseMat);
  nozzle.rotation.x = Math.PI / 2.2;
  nozzle.position.set(0, 0.62, 0.56);
  body.add(nozzle);

  [-0.16, 0.16].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), eyeMat);
    eye.position.set(ex, 0.88, 0.42);
    body.add(eye);
  });

  root.add(body);
  return { root, animPart: body };
}
