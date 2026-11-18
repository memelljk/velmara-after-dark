// mergegeo.js — tiny geometry merging helpers for Velmara After Dark.
// Static city geometry and vehicle / humanoid shells are baked into a handful
// of vertex-coloured meshes so the whole city renders in very few draw calls.
(function () {
  'use strict';
  var VAD = window.VAD = window.VAD || {};

  // Merge a list of { geo, matrix, color } parts into one BufferGeometry with
  // a per-vertex colour attribute. Geometries are de-indexed before merging.
  VAD.mergeParts = function (parts) {
    var pos = [], nor = [], col = [], count = 0;
    var c = new THREE.Color();
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      var g = p.geo.index ? p.geo.toNonIndexed() : p.geo;
      if (p.matrix) g.applyMatrix4(p.matrix);
      var pa = g.attributes.position.array;
      var na = g.attributes.normal.array;
      c.set(p.color === undefined ? 0xffffff : p.color);
      for (var v = 0; v < pa.length; v += 3) {
        pos.push(pa[v], pa[v + 1], pa[v + 2]);
        nor.push(na[v], na[v + 1], na[v + 2]);
        col.push(c.r, c.g, c.b);
        count++;
      }
      if (g !== p.geo) g.dispose();
    }
    var out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    out.userData.vertexCount = count;
    return out;
  };

  // Convenience: merge a list of boxes { w,h,d, x,y,z, ry, color }.
  VAD.mergeBoxes = function (boxes) {
    var parts = [];
    var m = new THREE.Matrix4(), q = new THREE.Quaternion(),
      e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1), t = new THREE.Vector3();
    for (var i = 0; i < boxes.length; i++) {
      var b = boxes[i];
      e.set(0, b.ry || 0, 0); q.setFromEuler(e);
      t.set(b.x || 0, b.y || 0, b.z || 0);
      m.compose(t, q, s);
      parts.push({ geo: new THREE.BoxGeometry(b.w, b.h, b.d), matrix: m.clone(), color: b.color });
    }
    return VAD.mergeParts(parts);
  };

  VAD.vertexColorMaterial = function (opts) {
    var o = opts || {};
    o.vertexColors = true;
    return new THREE.MeshLambertMaterial(o);
  };

  // One merged mesh from boxes, added to a parent.
  VAD.boxCloud = function (boxes, material, parent) {
    var mesh = new THREE.Mesh(VAD.mergeBoxes(boxes), material);
    mesh.matrixAutoUpdate = false;
    if (parent) parent.add(mesh);
    return mesh;
  };
})();
