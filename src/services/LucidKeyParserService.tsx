import JSZip from 'jszip';
import type { KeyData, FeatureNode, Feature, Score, StateScore, NumericScore, EntityProfile, FeatureType, ScoreType, Media, EntityNode } from '../types';

// --- Lucid Key Parser Service ---

export class LucidKeyParser {
  private parser = new DOMParser();
  private zip: JSZip | null = null;
  private rootPath: string = '';
  private keyName: string = '';
  private dataDirPath: string = '';

  private findFileInZip(zip: JSZip, path: string): JSZip.JSZipObject | null {
    const lowerPath = path.toLowerCase().replace(/\\/g, '/');
    const fileKey = Object.keys(zip.files).find(k => k.toLowerCase().replace(/\\/g, '/') === lowerPath);
    return fileKey ? zip.files[fileKey] : null;
  }

  private async readFromInnerZip(outerZip: JSZip, innerZipPath: string, targetFileName: string): Promise<string | null> {
    const innerZipFile = this.findFileInZip(outerZip, innerZipPath);
    if (!innerZipFile) {
      console.warn(`Inner zip file not found at: ${innerZipPath}`);
      return null;
    }
    try {
      const jszip = new JSZip();
      const innerZip = await jszip.loadAsync(await innerZipFile.async('arraybuffer'));
      const targetFile = this.findFileInZip(innerZip, targetFileName);
      return targetFile ? targetFile.async('string') : null;
    } catch (e) {
      console.error(`Error reading from inner zip ${innerZipPath}:`, e);
    }
    return null;
  }

  public async processKeyFromZip(zipFile: File): Promise<KeyData> {
    const jszip = new JSZip();
    try {
      this.zip = await jszip.loadAsync(zipFile);
    } catch (e) {
      console.error("JSZip failed to load the file:", e);
      throw new Error("The selected file could not be read. It might be corrupted or not a valid Lucid key (zip, lk4, lk5) file.");
    }

    this.keyName = zipFile.name.replace(/\.(zip|lk4|lk5)$/i, '');

    // FIX: Explicitly type 'file' as 'any' to resolve a TypeScript inference issue where it was being treated as 'unknown'.
    const dataDirEntry = Object.values(this.zip.files).find((file) =>
      (file as any).dir && (file as any).name.toLowerCase().replace(/\\/g, '/').endsWith('data/')
    );
    if (!dataDirEntry) {
      throw new Error('Invalid Lucid key zip: "Data" directory not found.');
    }
    this.dataDirPath = (dataDirEntry as any).name;
    this.rootPath = this.dataDirPath.substring(0, this.dataDirPath.toLowerCase().indexOf('data/'));

    const innerDataZipPath = `${this.dataDirPath}${this.keyName}.data`;
    const keyDataXml = await this.readFromInnerZip(this.zip, innerDataZipPath, 'key.data');
    if (!keyDataXml) {
      throw new Error(`Could not find or read "key.data" from the nested archive "${innerDataZipPath}".`);
    }

    const keyData: KeyData = {
      keyTitle: '', keyAuthors: '', keyDescription: '',
      allEntities: new Map(), entityTree: [], allFeatures: new Map(),
      entityMedia: new Map(), featureMedia: new Map(),
      featureTree: [], entityScores: new Map(),
      entityProfiles: new Map(), totalFeaturesCount: 0, parsingErrors: [],
      featureListForAI: [],
    };

    const keyDoc = this.parser.parseFromString(keyDataXml, "application/xml");
    const getProp = (key: string) => keyDoc.querySelector(`property[key="${key}"]`)?.getAttribute('value') || '';

    keyData.keyTitle = getProp('key_title') || this.keyName;
    keyData.keyAuthors = getProp('key_authors');
    keyData.keyDescription = getProp('key_description');

    keyDoc.querySelectorAll('entity_item').forEach(el => {
      const id = el.getAttribute('item_id');
      if (id) {
        const name = el.getAttribute('item_name') || 'Unknown Entity';
        keyData.allEntities.set(id, { id, name });
        keyData.entityScores.set(id, new Map<string, Score>());
        keyData.entityProfiles.set(id, { name, characteristics: [] });
      }
    });

    keyDoc.querySelectorAll('feature_item, state_item').forEach(el => {
      const isState = el.tagName === 'state_item';
      const type = (isState ? 'state' : el.getAttribute('score_type')) as FeatureType;
      if (type === 'text') return;
      const id = el.getAttribute('item_id');
      if (id) {
        const parentNode = (el.closest('feature_node')?.parentNode as Element)?.closest('feature_node');
        const parentName = parentNode?.querySelector(':scope > feature_item')?.getAttribute('item_name') ?? undefined;
        const name = el.getAttribute('item_name') || 'Unknown Feature';
        const featureInfo: Feature = {
          id, name, type, isState, parentName,
          base_unit: el.getAttribute('base_unit') ?? undefined,
          unit_prefix: el.getAttribute('unit_prefix') ?? undefined,
        };
        keyData.allFeatures.set(id, featureInfo);
        if (!isState && el.nextElementSibling?.tagName === 'nodes') return;
        keyData.featureListForAI.push({ id, type, description: parentName ? `${parentName}: ${name}` : name });
      }
    });

    const featureTreeRoot = keyDoc.querySelector('feature_tree');
    if (featureTreeRoot) {
      keyData.featureTree = Array.from(featureTreeRoot.children)
        .map(node => this.buildFeatureNode(node, keyData.allFeatures))
        .filter((node): node is FeatureNode => node !== null);
    }

    const entityTreeRoot = keyDoc.querySelector('entity_tree');
    if (entityTreeRoot) {
      keyData.entityTree = Array.from(entityTreeRoot.children)
        .map(node => this.buildEntityNode(node, keyData.allEntities))
        .filter((node): node is EntityNode => node !== null);
    }

    keyData.totalFeaturesCount = this.countAvailableFeatures(keyData.featureTree);
    await this.processScores(keyData);
    await this.processMedia(keyDoc, keyData);
    return keyData;
  }

  private buildFeatureNode(xmlNode: Element, allFeatures: Map<string, Feature>): FeatureNode | null {
    const itemElement = xmlNode.querySelector(':scope > feature_item, :scope > state_item');
    if (!itemElement) return null;
    const id = itemElement.getAttribute('item_id');
    if (!id) return null;
    const feature = allFeatures.get(id);
    if (!feature) return null;
    const node: FeatureNode = { id, name: feature.name, type: feature.type, isState: feature.isState, children: [] };
    const childrenContainer = xmlNode.querySelector(':scope > nodes');
    if (childrenContainer) {
      node.children = Array.from(childrenContainer.children)
        .map(childNode => this.buildFeatureNode(childNode, allFeatures))
        .filter((child): child is FeatureNode => child !== null);
    }
    return node;
  }

  private buildEntityNode(xmlNode: Element, allEntities: Map<string, {id: string, name: string}>): EntityNode | null {
    const itemElement = xmlNode.querySelector(':scope > entity_item');
    if (!itemElement) return null;
    const id = itemElement.getAttribute('item_id');
    if (!id) return null;
    const entity = allEntities.get(id);
    if (!entity) return null;
    const childrenContainer = xmlNode.querySelector(':scope > nodes');
    const children = childrenContainer ? Array.from(childrenContainer.children)
      .map(childNode => this.buildEntityNode(childNode, allEntities))
      .filter((child): child is EntityNode => child !== null) : [];
    const node: EntityNode = { id, name: entity.name, children, isGroup: children.length > 0 };
    return node;
  }

  private countAvailableFeatures(nodes: FeatureNode[]): number {
    let count = 0;
    for (const node of nodes) {
      // Case 1: The node is a numeric feature. Count it.
      if (node.type === 'numeric') {
        count++;
      }
      // Case 2: The node is a categorical feature (i.e., its children are states). Count it.
      // We don't recurse into its children because they are states, not features.
      else if (node.children?.length && node.children[0].isState) {
        count++;
      }
      // Case 3: The node is a grouping node (its children are other features).
      // Don't count the group itself, but recurse to find features within it.
      else if (node.children?.length) {
        count += this.countAvailableFeatures(node.children);
      }
    }
    return count;
  }

  private async processScores(keyData: KeyData) {
    if (!this.zip) return;
    const innerScoZipPath = `${this.dataDirPath}${this.keyName}.sco`;
    const normalScoXml = await this.readFromInnerZip(this.zip, innerScoZipPath, 'normal.sco');

    if (!normalScoXml) {
      console.warn(`Could not find or read "normal.sco" from "${innerScoZipPath}". Scores will not be loaded.`);
      return;
    };

    const doc = this.parser.parseFromString(normalScoXml, "application/xml");

    const getUnitSymbol = (feature?: Feature) => {
      if (!feature || feature.type !== 'numeric') return '';
      const UNIT_PREFIX_MAP: Record<string, string> = { 'kilo': 'k', 'hecto': 'h', 'deca': 'da', 'deci': 'd', 'centi': 'c', 'milli': 'm', 'micro': 'µ', 'none': '' };
      const BASE_UNIT_MAP: Record<string, string> = { 'metre': 'm', 'square metre': 'm²', 'cubic metre': 'm³', 'litre': 'l', 'degrees celcius': '°C', 'degrees planar': '°', 'none': '' };
      const prefix = UNIT_PREFIX_MAP[feature.unit_prefix || 'none'] || '';
      const base = BASE_UNIT_MAP[feature.base_unit || 'none'] || '';
      return prefix + base;
    }

    doc.querySelectorAll('normal_score_data > scoring_item').forEach(si => {
      const stateId = si.getAttribute('item_id');
      if (!stateId) return;
      const stateInfo = keyData.allFeatures.get(stateId);
      if (!stateInfo) return;

      si.querySelectorAll('scored_item').forEach(sci => {
        const entityId = sci.getAttribute('item_id');
        const scoreValue = sci.getAttribute('value') as ScoreType;
        if (entityId && scoreValue) {
          const score: StateScore = { value: scoreValue };
          keyData.entityScores.get(entityId)?.set(stateId, score);

          const profile = keyData.entityProfiles.get(entityId);
          if (profile) {
            profile.characteristics.push({ text: stateInfo.name, parent: stateInfo.parentName || 'Others', type: 'state', score: scoreValue });
          }
        }
      });
    });

    doc.querySelectorAll('numeric_score_data > scoring_item').forEach(si => {
      const featureId = si.getAttribute('item_id');
      if (!featureId) return;
      const featureInfo = keyData.allFeatures.get(featureId);
      if (!featureInfo) return;

      si.querySelectorAll('scored_item').forEach(sci => {
        const data = sci.querySelector('scored_data');
        const entityId = sci.getAttribute('item_id');
        if (data && entityId) {
          const range: NumericScore = {
            min: parseFloat(data.getAttribute('omin') || '0'),
            max: parseFloat(data.getAttribute('omax') || '0'),
          };
          keyData.entityScores.get(entityId)?.set(featureId, range);

          const profile = keyData.entityProfiles.get(entityId);
          if (profile) {
            profile.characteristics.push({ text: `${range.min} - ${range.max} ${getUnitSymbol(featureInfo)}`, parent: featureInfo.name, type: 'numeric' });
          }
        }
      });
    });
  }

  private async getBlobUrlFromZip(filePath: string, keyData: KeyData): Promise<string | null> {
    if (!this.zip) return null;
    const fullPath = (this.rootPath + filePath).replace(/\\/g, '/');
    const file = this.findFileInZip(this.zip, fullPath);
    if (file) {
      try {
        const blob = await file.async('blob');
        const url = URL.createObjectURL(blob);
        return url;
      } catch (e) {
        console.error(`Failed to get blob for ${fullPath}`, e);
        return null;
      }
    }
    const errorMsg = `Media file not found in archive: ${fullPath}`;
    keyData.parsingErrors.push(errorMsg);
    return null;
  }

  private async processMedia(keyDoc: Document, keyData: KeyData) {
    for (const mediaItem of keyDoc.querySelectorAll('media_item')) {
      const details = mediaItem.querySelector('media_details');
      const pathFromXml = mediaItem.getAttribute('media_path'); // e.g., Images/img.jpg
      if (!details || !pathFromXml) continue;

      const itemId = details.getAttribute('item_id');
      if (!itemId) continue;

      try {
        // Correctly prepend Media/ to the path from the XML
        const fullPathInZip = 'Media/' + pathFromXml;
        const url = await this.getBlobUrlFromZip(fullPathInZip, keyData);
        if (!url) continue;

        const mediaData: Media = {
          url,
          caption: details.getAttribute('caption') || undefined,
          copyright: details.getAttribute('copyright') || undefined,
          comments: details.getAttribute('comments') || undefined,
        };

        if (keyData.allEntities.has(itemId)) {
          if (!keyData.entityMedia.has(itemId)) keyData.entityMedia.set(itemId, []);
          keyData.entityMedia.get(itemId)!.push(mediaData);
        } else if (keyData.allFeatures.has(itemId)) {
          if (!keyData.featureMedia.has(itemId)) keyData.featureMedia.set(itemId, []);
          keyData.featureMedia.get(itemId)!.push(mediaData);
        }
      } catch (e) {
        console.warn(`Could not load media from zip path: ${pathFromXml}`, e);
      }
    }
  }
}
