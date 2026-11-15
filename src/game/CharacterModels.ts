import * as THREE from 'three';
import { makeFeltMaterial } from './FeltMaterials';

export interface PuppetRig {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
}

function addGooglyEyes(head: THREE.Group, zOffset: number, eyeScale = 1, eyeSpacing = 0.22): void {
  const eyeWhiteMat = makeFeltMaterial(0xf7f1d5, { roughness: 0.85, bumpScale: 0.01 });
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x16161d, roughness: 0.35 });

  [-1, 1].forEach((side, idx) => {
    const scale = idx === 1 ? eyeScale * 0.92 : eyeScale * 1.06;
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14 * scale, 14, 14), eyeWhiteMat);
    eye.position.set(side * eyeSpacing, 0.05, zOffset);
    eye.scale.z = 0.65;
    head.add(eye);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.065 * scale, 10, 10), pupilMat);
    pupil.position.set(side * eyeSpacing, 0.05, zOffset + 0.075 * scale);
    head.add(pupil);
  });

  const mouthMat = new THREE.MeshStandardMaterial({ color: 0x2a1419, roughness: 0.9 });
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.09, 0.08), mouthMat);
  mouth.position.set(0, -0.17, zOffset - 0.02);
  head.add(mouth);

  const toothMat = makeFeltMaterial(0xf3eedc, { roughness: 0.8 });
  [-0.08, 0.02, 0.09].forEach((tx) => {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), toothMat);
    tooth.position.set(tx, -0.15, zOffset + 0.01);
    head.add(tooth);
  });
}

function makeShadowBlob(): THREE.Mesh {
  const mat = new THREE.MeshBasicMaterial({
    color: 0x050811,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.72, 20), mat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  return shadow;
}

function addStandardLimbs(
  body: THREE.Group,
  leftArm: THREE.Group,
  rightArm: THREE.Group,
  leftLeg: THREE.Group,
  rightLeg: THREE.Group,
  armMat: THREE.Material,
  legMat: THREE.Material,
  footMat: THREE.Material,
  armX = 0.4,
  armY = 1.12,
  legX = 0.17,
  legY = 0.54
): void {
  [-1, 1].forEach((side) => {
    const armGrp = side < 0 ? leftArm : rightArm;
    armGrp.position.set(side * armX, armY, 0);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.36, 6, 10), armMat);
    arm.position.y = -0.2;
    arm.castShadow = true;
    armGrp.add(arm);
    body.add(armGrp);

    const legGrp = side < 0 ? leftLeg : rightLeg;
    legGrp.position.set(side * legX, legY, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.32, 6, 10), legMat);
    leg.position.y = -0.18;
    leg.castShadow = true;
    legGrp.add(leg);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), footMat);
    foot.scale.set(1, 0.65, 1.4);
    foot.position.set(0, -0.42, 0.05);
    legGrp.add(foot);
    body.add(legGrp);
  });
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
    const skinMat = makeFeltMaterial(0xd94848);
    const shirtMat = makeFeltMaterial(0xe6e0d2);
    const jeansMat = makeFeltMaterial(0x3a649c);
    const bootMat = makeFeltMaterial(0x6e472b);

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.72, 14), shirtMat);
    torso.position.y = 0.92;
    torso.castShadow = true;
    body.add(torso);

    head.position.set(0, 1.58, 0);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 16), skinMat);
    skull.scale.set(0.95, 1.08, 0.95);
    skull.castShadow = true;
    head.add(skull);
    addGooglyEyes(head, 0.36, 1.0, 0.17);

    const bootBase = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.36, 12), bootMat);
    bootBase.position.set(0, 0.52, -0.02);
    bootBase.rotation.z = 0.14;
    head.add(bootBase);
    const bootToe = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.44), bootMat);
    bootToe.position.set(-0.05, 0.68, 0.12);
    bootToe.rotation.z = 0.15;
    head.add(bootToe);
    body.add(head);

    addStandardLimbs(body, leftArm, rightArm, leftLeg, rightLeg, skinMat, jeansMat, skinMat);
  } else if (charId === 'blue_partin') {
    const skinMat = makeFeltMaterial(0x32a5dc);
    const shirtMat = makeFeltMaterial(0xe5dfd1);
    const pantsMat = makeFeltMaterial(0x2d4870);
    const coneOrange = makeFeltMaterial(0xf07822);
    const coneWhite = makeFeltMaterial(0xf5f5f0);
    const tieMat = makeFeltMaterial(0xb44f7c);

    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.54, 18, 16), shirtMat);
    torso.scale.set(1.08, 0.95, 0.95);
    torso.position.y = 0.88;
    torso.castShadow = true;
    body.add(torso);

    const tie = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.42, 6), tieMat);
    tie.rotation.x = Math.PI;
    tie.position.set(0, 0.85, 0.5);
    body.add(tie);

    head.position.set(0, 1.56, 0);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.45, 18, 16), skinMat);
    skull.castShadow = true;
    head.add(skull);
    addGooglyEyes(head, 0.4, 1.0, 0.18);

    const coneRim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.06, 16), coneOrange);
    coneRim.position.set(0.08, 0.38, 0);
    coneRim.rotation.z = -0.18;
    head.add(coneRim);
    const coneTop = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.55, 16), coneOrange);
    coneTop.position.set(0.13, 0.65, 0);
    coneTop.rotation.z = -0.18;
    head.add(coneTop);
    const coneStripe = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.19, 0.14, 16), coneWhite);
    coneStripe.position.set(0.13, 0.63, 0);
    coneStripe.rotation.z = -0.18;
    head.add(coneStripe);
    body.add(head);

    addStandardLimbs(body, leftArm, rightArm, leftLeg, rightLeg, skinMat, pantsMat, skinMat, 0.54, 1.08, 0.22, 0.45);
  } else if (charId === 'green_glassy') {
    const skinMat = makeFeltMaterial(0x88b86c);
    const pantsMat = makeFeltMaterial(0x60432d);
    const shirtMat = makeFeltMaterial(0xe3d8c4);
    const glassesMat = new THREE.MeshStandardMaterial({ color: 0x1e2026, roughness: 0.4 });
    const bookMat = makeFeltMaterial(0xebd04b);
    const chickenMat = makeFeltMaterial(0xf5b82e);

    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 14), shirtMat);
    torso.position.y = 0.78;
    torso.castShadow = true;
    body.add(torso);

    head.position.set(0, 1.44, 0);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.48, 18, 16), skinMat);
    skull.castShadow = true;
    head.add(skull);
    addGooglyEyes(head, 0.42, 1.05, 0.19);

    [-0.19, 0.19].forEach((gx) => {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.032, 10, 20), glassesMat);
      rim.position.set(gx, 0.05, 0.45);
      head.add(rim);
    });
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.03), glassesMat);
    bridge.position.set(0, 0.06, 0.46);
    head.add(bridge);
    body.add(head);

    addStandardLimbs(body, leftArm, rightArm, leftLeg, rightLeg, skinMat, pantsMat, pantsMat, 0.42, 0.92, 0.17, 0.44);
    const book = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.36, 0.09), bookMat);
    book.position.set(0.05, -0.22, 0.2);
    book.rotation.y = 0.35;
    leftArm.add(book);
    const chicken = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.24, 6, 10), chickenMat);
    chicken.position.set(0, -0.18, 0.18);
    chicken.rotation.x = 0.4;
    rightArm.add(chicken);
  } else if (charId === 'purple_chef') {
    const skinMat = makeFeltMaterial(0x7c4aa8);
    const apronMat = makeFeltMaterial(0x478a4e);
    const hatMat = makeFeltMaterial(0xf2ece0);
    const metalMat = new THREE.MeshStandardMaterial({ color: 0xc8d0da, metalness: 0.7, roughness: 0.3 });

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 0.68, 14), apronMat);
    torso.position.y = 0.82;
    torso.castShadow = true;
    body.add(torso);

    head.position.set(0, 1.48, 0);
    const boxHead = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.62, 0.64), skinMat);
    boxHead.castShadow = true;
    head.add(boxHead);
    addGooglyEyes(head, 0.32, 1.0, 0.18);

    const hatBase = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.22, 14), hatMat);
    hatBase.position.set(0.12, 0.42, 0);
    hatBase.rotation.z = -0.16;
    head.add(hatBase);
    const hatPuff = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), hatMat);
    hatPuff.position.set(0.16, 0.56, 0);
    head.add(hatPuff);
    body.add(head);

    addStandardLimbs(body, leftArm, rightArm, leftLeg, rightLeg, metalMat, skinMat, skinMat, 0.42, 1.05, 0.18, 0.46);
    const whisk = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), metalMat);
    whisk.scale.set(0.75, 1.35, 0.75);
    whisk.position.set(0, -0.48, 0.16);
    rightArm.add(whisk);
  } else if (charId === 'orange_cheney') {
    const skinMat = makeFeltMaterial(0xe8782c);
    const capMat = makeFeltMaterial(0x468a4d);
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd24c, metalness: 0.7, roughness: 0.25 });
    const batMat = makeFeltMaterial(0xb88b5a);

    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.48, 16, 14), skinMat);
    torso.scale.set(1.05, 0.95, 0.95);
    torso.position.y = 0.86;
    torso.castShadow = true;
    body.add(torso);

    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.04, 8, 16), goldMat);
    chain.rotation.x = Math.PI / 2.2;
    chain.position.set(0, 1.15, 0.14);
    body.add(chain);

    head.position.set(0, 1.5, 0);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.44, 18, 16), skinMat);
    head.add(skull);
    addGooglyEyes(head, 0.39, 1.0, 0.18);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), capMat);
    cap.position.y = 0.18;
    head.add(cap);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.06, 0.3), capMat);
    visor.position.set(0, 0.24, 0.32);
    head.add(visor);
    body.add(head);

    addStandardLimbs(body, leftArm, rightArm, leftLeg, rightLeg, skinMat, skinMat, skinMat, 0.5, 1.02, 0.19, 0.45);
    const bat = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.05, 0.72, 10), batMat);
    bat.position.set(0, -0.35, 0.25);
    bat.rotation.x = -0.6;
    rightArm.add(bat);
  } else if (charId === 'yellow_stripes') {
    const skinMat = makeFeltMaterial(0xedd047);
    const suitMat = makeFeltMaterial(0x282830);
    const bucketMat = new THREE.MeshStandardMaterial({ color: 0x997f6e, metalness: 0.5, roughness: 0.55 });
    const stickMat = makeFeltMaterial(0xe3d1af);

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.85, 12), suitMat);
    torso.position.y = 0.96;
    torso.castShadow = true;
    body.add(torso);

    head.position.set(0, 1.66, 0);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.39, 16, 14), skinMat);
    head.add(skull);
    addGooglyEyes(head, 0.34, 1.0, 0.16);
    const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.36, 14), bucketMat);
    bucket.position.set(0.1, 0.46, 0);
    bucket.rotation.z = -0.2;
    head.add(bucket);
    body.add(head);

    addStandardLimbs(body, leftArm, rightArm, leftLeg, rightLeg, skinMat, suitMat, skinMat, 0.35, 1.24, 0.14, 0.56);
    [leftArm, rightArm].forEach((arm) => {
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 8), stickMat);
      stick.position.set(0, -0.38, 0.22);
      stick.rotation.x = Math.PI / 2.2;
      arm.add(stick);
    });
  } else if (charId === 'polka_pippin') {
    const skinMat = makeFeltMaterial(0x88c440);
    const dressMat = makeFeltMaterial(0xc9b48d);
    const hatMat = makeFeltMaterial(0xd9664c);
    const eyeBallMat = makeFeltMaterial(0xf7f5eb);

    const torso = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.72, 14), dressMat);
    torso.position.y = 0.74;
    torso.castShadow = true;
    body.add(torso);

    head.position.set(0, 1.38, 0);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.44, 16, 16), skinMat);
    head.add(skull);
    addGooglyEyes(head, 0.39, 1.0, 0.18);
    const partyHat = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.44, 12), hatMat);
    partyHat.position.y = 0.54;
    head.add(partyHat);
    body.add(head);

    addStandardLimbs(body, leftArm, rightArm, leftLeg, rightLeg, skinMat, skinMat, skinMat, 0.38, 0.94, 0.15, 0.42);
    [leftArm, rightArm].forEach((arm) => {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), eyeBallMat);
      ball.position.set(0, -0.32, 0.2);
      arm.add(ball);
    });
  } else if (charId === 'mummy_wrapple') {
    const skinMat = makeFeltMaterial(0xc988a5);
    const wrapMat = makeFeltMaterial(0xe6dcc5);
    const lanternMat = new THREE.MeshStandardMaterial({ color: 0xffd466, emissive: 0xffaa22, emissiveIntensity: 1.5 });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.46, 6, 12), wrapMat);
    torso.position.y = 0.92;
    torso.castShadow = true;
    body.add(torso);

    head.position.set(0, 1.54, 0);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 14), skinMat);
    head.add(skull);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.07, 8, 18), wrapMat);
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.22;
    head.add(band);
    addGooglyEyes(head, 0.38, 1.0, 0.17);
    body.add(head);

    addStandardLimbs(body, leftArm, rightArm, leftLeg, rightLeg, wrapMat, wrapMat, skinMat, 0.4, 1.08, 0.15, 0.5);
    const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.22), lanternMat);
    lantern.position.set(0, -0.45, 0.15);
    rightArm.add(lantern);
  } else if (charId === 'green_prof') {
    const skinMat = makeFeltMaterial(0x889c7c);
    const coatMat = makeFeltMaterial(0xdfd7c3);
    const flaskMat = new THREE.MeshStandardMaterial({ color: 0x45f07d, emissive: 0x20aa4d, emissiveIntensity: 1.2 });
    const glassesMat = new THREE.MeshStandardMaterial({ color: 0x222228 });

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 0.9, 14), coatMat);
    torso.position.y = 0.92;
    torso.castShadow = true;
    body.add(torso);

    head.position.set(0, 1.62, 0);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.39, 16, 14), skinMat);
    head.add(skull);
    addGooglyEyes(head, 0.34, 1.0, 0.16);
    [-0.16, 0.16].forEach((gx) => {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.028, 8, 16), glassesMat);
      rim.position.set(gx, 0.05, 0.38);
      head.add(rim);
    });
    body.add(head);

    addStandardLimbs(body, leftArm, rightArm, leftLeg, rightLeg, coatMat, skinMat, skinMat, 0.38, 1.2, 0.15, 0.52);
    const flask = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), flaskMat);
    flask.position.set(0, -0.4, 0.18);
    rightArm.add(flask);
  } else if (charId === 'scarf_miina') {
    const skinMat = makeFeltMaterial(0x69a7b8);
    const hairMat = makeFeltMaterial(0x7c459c);
    const dressMat = makeFeltMaterial(0xc93b3b);
    const bearMat = makeFeltMaterial(0x9c6b42);

    const torso = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.72, 14), dressMat);
    torso.position.y = 0.74;
    torso.castShadow = true;
    body.add(torso);

    head.position.set(0, 1.38, 0);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 14), skinMat);
    head.add(skull);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.58), hairMat);
    hair.position.y = 0.04;
    head.add(hair);
    addGooglyEyes(head, 0.38, 1.0, 0.16);
    body.add(head);

    addStandardLimbs(body, leftArm, rightArm, leftLeg, rightLeg, skinMat, skinMat, skinMat, 0.36, 0.94, 0.15, 0.42);
    const bear = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), bearMat);
    bear.position.set(0, 0.85, 0.44);
    body.add(bear);
  } else if (charId === 'brains_blossom') {
    const skinMat = makeFeltMaterial(0xe87898);
    const bibMat = makeFeltMaterial(0xf7f2e8);
    const hatMat = makeFeltMaterial(0xd996c2);
    const cakeMat = makeFeltMaterial(0x704328);

    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.46, 16, 14), skinMat);
    torso.position.y = 0.82;
    torso.castShadow = true;
    body.add(torso);
    const bib = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.36, 0.12), bibMat);
    bib.position.set(0, 0.95, 0.4);
    body.add(bib);

    head.position.set(0, 1.46, 0);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.43, 16, 14), skinMat);
    head.add(skull);
    addGooglyEyes(head, 0.38, 1.0, 0.17);
    const partyHat = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.44, 12), hatMat);
    partyHat.position.y = 0.54;
    head.add(partyHat);
    body.add(head);

    addStandardLimbs(body, leftArm, rightArm, leftLeg, rightLeg, skinMat, skinMat, skinMat, 0.45, 0.95, 0.17, 0.44);
    const cupcake = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.18, 10), cakeMat);
    cupcake.position.set(0, -0.35, 0.2);
    rightArm.add(cupcake);
  } else {
    // captain_patch playable!
    const skinMat = makeFeltMaterial(0x37a4d1);
    const coatMat = makeFeltMaterial(0x703b96);
    const hatMat = makeFeltMaterial(0x1f1e28);
    const rabbitMat = makeFeltMaterial(0xfaf5ee);
    const wandMat = makeFeltMaterial(0x2d2424);

    const torso = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.96, 14), coatMat);
    torso.position.y = 0.82;
    torso.castShadow = true;
    body.add(torso);

    head.position.set(0, 1.56, 0);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 14), skinMat);
    head.add(skull);
    addGooglyEyes(head, 0.35, 1.0, 0.17);
    const patch = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 12), hatMat);
    patch.rotation.x = Math.PI / 2;
    patch.position.set(0.17, 0.05, 0.38);
    head.add(patch);

    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.05, 14), hatMat);
    brim.position.set(-0.08, 0.36, 0);
    brim.rotation.z = 0.16;
    head.add(brim);
    const hatTop = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.22, 0.42, 14), hatMat);
    hatTop.position.set(-0.12, 0.56, 0);
    hatTop.rotation.z = 0.16;
    head.add(hatTop);
    const rabbit = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 10), rabbitMat);
    rabbit.position.set(0.16, 0.45, 0.04);
    head.add(rabbit);
    body.add(head);

    addStandardLimbs(body, leftArm, rightArm, leftLeg, rightLeg, coatMat, hatMat, skinMat, 0.4, 1.12, 0.16, 0.46);
    const wand = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.58, 8), wandMat);
    wand.position.set(0, -0.35, 0.25);
    wand.rotation.x = Math.PI / 3;
    rightArm.add(wand);
  }

  return { root, body, head, leftArm, rightArm, leftLeg, rightLeg };
}

export type EnemyKind = 'scissor' | 'crow' | 'vacuum' | 'boss_patch' | 'boss_chef' | 'boss_prof';

export function buildEnemyPuppet(kind: EnemyKind): { root: THREE.Group; animPart: THREE.Object3D; animPart2?: THREE.Object3D } {
  if (kind === 'boss_chef') {
    const rig = buildPlayablePuppet('purple_chef');
    rig.root.scale.setScalar(2.15);
    return { root: rig.root, animPart: rig.head, animPart2: rig.rightArm };
  }
  if (kind === 'boss_prof') {
    const rig = buildPlayablePuppet('green_prof');
    rig.root.scale.setScalar(2.15);
    return { root: rig.root, animPart: rig.head, animPart2: rig.rightArm };
  }

  const root = new THREE.Group();
  root.add(makeShadowBlob());

  if (kind === 'scissor') {
    const bodyMat = makeFeltMaterial(0x9e7b56);
    const metalMat = new THREE.MeshStandardMaterial({ color: 0xd0d8e2, metalness: 0.75, roughness: 0.25 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xfff5d6, roughness: 0.6 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.76, 0.64), bodyMat);
    body.position.y = 0.62;
    body.castShadow = true;
    root.add(body);

    [-0.18, 0.18].forEach((ex) => {
      const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 12), eyeMat);
      btn.rotation.x = Math.PI / 2;
      btn.position.set(ex, 0.74, 0.34);
      root.add(btn);
    });

    const blade1 = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.78, 4), metalMat);
    blade1.position.set(-0.14, 1.32, 0);
    blade1.rotation.z = 0.28;
    root.add(blade1);

    const blade2 = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.78, 4), metalMat);
    blade2.position.set(0.14, 1.32, 0);
    blade2.rotation.z = -0.28;
    root.add(blade2);

    return { root, animPart: blade1, animPart2: blade2 };
  }

  if (kind === 'crow') {
    const crowMat = makeFeltMaterial(0x26293d);
    const beakMat = makeFeltMaterial(0xf2a93b);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffe46b, emissive: 0x664400, emissiveIntensity: 0.4 });

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12), crowMat);
    body.position.y = 0.95;
    body.castShadow = true;
    root.add(body);

    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.34, 8), beakMat);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.96, 0.46);
    root.add(beak);

    [-0.16, 0.16].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), eyeMat);
      eye.position.set(ex, 1.06, 0.35);
      root.add(eye);
    });

    const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.32), crowMat);
    wingL.position.set(-0.5, 1.0, 0);
    root.add(wingL);
    const wingR = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.32), crowMat);
    wingR.position.set(0.5, 1.0, 0);
    root.add(wingR);

    return { root, animPart: wingL, animPart2: wingR };
  }

  if (kind === 'vacuum') {
    const bodyMat = makeFeltMaterial(0xc93b5b);
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a2d36, roughness: 0.4, metalness: 0.4 });
    const canister = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.85, 16), bodyMat);
    canister.position.y = 0.58;
    canister.castShadow = true;
    root.add(canister);

    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, 0.55, 12), darkMat);
    nozzle.rotation.x = Math.PI / 2.4;
    nozzle.position.set(0, 0.65, 0.54);
    root.add(nozzle);

    const eyeGlow = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.14, 0.1),
      new THREE.MeshStandardMaterial({ color: 0xffeb66, emissive: 0xffaa00, emissiveIntensity: 0.7 })
    );
    eyeGlow.position.set(0, 0.88, 0.42);
    root.add(eyeGlow);

    return { root, animPart: canister };
  }

  // boss_patch
  const rig = buildPlayablePuppet('captain_patch');
  rig.root.scale.setScalar(2.15);
  return { root: rig.root, animPart: rig.head, animPart2: rig.body };
}
