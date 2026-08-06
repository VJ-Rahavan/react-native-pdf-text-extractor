import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  getPageCount(filePath: string): Promise<number>;
  extractText(filePath: string): Promise<string>;
  extractAllText(filePath: string): Promise<string[]>;
  extractPageText(filePath: string, pageIndex: number): Promise<string>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('RnPdfTextExtractor');
