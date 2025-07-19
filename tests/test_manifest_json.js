const fs = require('node:fs');
const path = require('node:path');

// Testing framework: Jest
// This comprehensive test suite validates the Chrome extension manifest.json file
// to ensure it meets Chrome Extension Manifest V3 specifications and best practices

describe('manifest.json validation', () => {
  let manifestData;
  let manifestPath;

  beforeAll(() => {
    // Load the manifest file
    manifestPath = path.join(__dirname, '..', 'manifest.json');
    try {
      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
      manifestData = JSON.parse(manifestContent);
    } catch (error) {
      throw new Error(`Failed to load or parse manifest.json: ${error.message}`);
    }
  });

  describe('Basic structure validation', () => {
    test('should be valid JSON', () => {
      expect(manifestData).toBeDefined();
      expect(typeof manifestData).toBe('object');
      expect(manifestData).not.toBeNull();
    });

    test('should have required top-level properties', () => {
      const requiredProperties = [
        'manifest_version',
        'name',
        'version',
        'description'
      ];
      
      requiredProperties.forEach(prop => {
        expect(manifestData).toHaveProperty(prop);
        expect(manifestData[prop]).toBeDefined();
        expect(manifestData[prop]).not.toBe('');
      });
    });
  });

  describe('Manifest version validation', () => {
    test('should use manifest version 3', () => {
      expect(manifestData.manifest_version).toBe(3);
      expect(typeof manifestData.manifest_version).toBe('number');
    });

    test('should not use deprecated manifest version 2', () => {
      expect(manifestData.manifest_version).not.toBe(2);
    });

    test('should not use invalid manifest version', () => {
      expect(manifestData.manifest_version).toBeGreaterThan(0);
      expect(manifestData.manifest_version).toBeLessThanOrEqual(3);
    });
  });

  describe('Extension metadata validation', () => {
    test('should have valid name', () => {
      expect(manifestData.name).toBe('Fontify');
      expect(typeof manifestData.name).toBe('string');
      expect(manifestData.name.length).toBeGreaterThan(0);
      expect(manifestData.name.length).toBeLessThanOrEqual(45); // Chrome extension name limit
    });

    test('should have valid version format', () => {
      expect(manifestData.version).toBe('1.0');
      expect(typeof manifestData.version).toBe('string');
      expect(manifestData.version).toMatch(/^\d+(\.\d+)*$/); // Version format: digits separated by dots
    });

    test('should have meaningful description', () => {
      expect(manifestData.description).toBe('現在のサイトのフォントを指定したWebフォントに置換します。');
      expect(typeof manifestData.description).toBe('string');
      expect(manifestData.description.length).toBeGreaterThan(0);
      expect(manifestData.description.length).toBeLessThanOrEqual(132); // Chrome extension description limit
    });

    test('should have Japanese description for localization', () => {
      // Test that description contains Japanese characters
      expect(manifestData.description).toMatch(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/);
    });

    test('should not have empty or whitespace-only metadata', () => {
      expect(manifestData.name.trim()).toBe(manifestData.name);
      expect(manifestData.version.trim()).toBe(manifestData.version);
      expect(manifestData.description.trim()).toBe(manifestData.description);
    });
  });

  describe('Permissions validation', () => {
    test('should have permissions array', () => {
      expect(Array.isArray(manifestData.permissions)).toBe(true);
      expect(manifestData.permissions.length).toBeGreaterThan(0);
    });

    test('should include required permissions', () => {
      const expectedPermissions = ['storage', 'scripting', 'activeTab'];
      expectedPermissions.forEach(permission => {
        expect(manifestData.permissions).toContain(permission);
      });
    });

    test('should not have duplicate permissions', () => {
      const uniquePermissions = [...new Set(manifestData.permissions)];
      expect(manifestData.permissions.length).toBe(uniquePermissions.length);
    });

    test('should only contain valid permission strings', () => {
      manifestData.permissions.forEach(permission => {
        expect(typeof permission).toBe('string');
        expect(permission.length).toBeGreaterThan(0);
        expect(permission.trim()).toBe(permission);
      });
    });

    test('should not include unnecessary broad permissions', () => {
      const unnecessaryPermissions = ['tabs', 'webNavigation', 'history'];
      unnecessaryPermissions.forEach(permission => {
        expect(manifestData.permissions).not.toContain(permission);
      });
    });
  });

  describe('Host permissions validation', () => {
    test('should have host_permissions array', () => {
      expect(Array.isArray(manifestData.host_permissions)).toBe(true);
      expect(manifestData.host_permissions.length).toBeGreaterThan(0);
    });

    test('should include all URLs permission', () => {
      expect(manifestData.host_permissions).toContain('<all_urls>');
    });

    test('should have valid host permission format', () => {
      manifestData.host_permissions.forEach(hostPermission => {
        expect(typeof hostPermission).toBe('string');
        expect(hostPermission.length).toBeGreaterThan(0);
        // Should be either <all_urls> or a valid URL pattern
        expect(
          hostPermission === '<all_urls>' ||
          hostPermission.match(/^https?:\/\/\*?[\w.-]*\/?\*?$/) ||
          hostPermission.match(/^file:\/\/\/\*$/)
        ).toBeTruthy();
      });
    });

    test('should not have duplicate host permissions', () => {
      const uniqueHostPermissions = [...new Set(manifestData.host_permissions)];
      expect(manifestData.host_permissions.length).toBe(uniqueHostPermissions.length);
    });
  });

  describe('Background script validation', () => {
    test('should have background configuration', () => {
      expect(manifestData.background).toBeDefined();
      expect(typeof manifestData.background).toBe('object');
    });

    test('should use service worker for MV3', () => {
      expect(manifestData.background.service_worker).toBe('background.js');
      expect(typeof manifestData.background.service_worker).toBe('string');
      // Should not have 'scripts' property (MV2 feature)
      expect(manifestData.background.scripts).toBeUndefined();
    });

    test('should not have persistent background for MV3', () => {
      expect(manifestData.background.persistent).toBeUndefined();
    });

    test('should not have type property in background', () => {
      expect(manifestData.background.type).toBeUndefined();
    });

    test('background script file should have proper extension', () => {
      expect(manifestData.background.service_worker).toMatch(/\.js$/);
    });
  });

  describe('Content scripts validation', () => {
    test('should have content_scripts array', () => {
      expect(Array.isArray(manifestData.content_scripts)).toBe(true);
      expect(manifestData.content_scripts.length).toBeGreaterThan(0);
    });

    test('should have valid content script configuration', () => {
      const contentScript = manifestData.content_scripts[0];
      
      expect(contentScript.matches).toBeDefined();
      expect(Array.isArray(contentScript.matches)).toBe(true);
      expect(contentScript.matches).toContain('<all_urls>');
      
      expect(contentScript.js).toBeDefined();
      expect(Array.isArray(contentScript.js)).toBe(true);
      expect(contentScript.js).toContain('content.js');
      
      expect(contentScript.run_at).toBe('document_idle');
    });

    test('should have valid run_at values', () => {
      const validRunAtValues = ['document_start', 'document_end', 'document_idle'];
      manifestData.content_scripts.forEach(script => {
        if (script.run_at) {
          expect(validRunAtValues).toContain(script.run_at);
        }
      });
    });

    test('should have proper file extensions for scripts', () => {
      manifestData.content_scripts.forEach(script => {
        script.js.forEach(jsFile => {
          expect(jsFile).toMatch(/\.js$/);
        });
        if (script.css) {
          script.css.forEach(cssFile => {
            expect(cssFile).toMatch(/\.css$/);
          });
        }
      });
    });

    test('should not have invalid properties in content scripts', () => {
      manifestData.content_scripts.forEach(script => {
        expect(script.persistent).toBeUndefined();
        expect(script.all_frames).toBeUndefined();
      });
    });
  });

  describe('Options UI validation', () => {
    test('should have options_ui configuration', () => {
      expect(manifestData.options_ui).toBeDefined();
      expect(typeof manifestData.options_ui).toBe('object');
    });

    test('should have valid options page configuration', () => {
      expect(manifestData.options_ui.page).toBe('options.html');
      expect(typeof manifestData.options_ui.page).toBe('string');
      expect(manifestData.options_ui.open_in_tab).toBe(true);
      expect(typeof manifestData.options_ui.open_in_tab).toBe('boolean');
    });

    test('should have proper file extension for options page', () => {
      expect(manifestData.options_ui.page).toMatch(/\.html$/);
    });

    test('should not have chrome_style property', () => {
      expect(manifestData.options_ui.chrome_style).toBeUndefined();
    });
  });

  describe('Action (popup) validation', () => {
    test('should have action configuration', () => {
      expect(manifestData.action).toBeDefined();
      expect(typeof manifestData.action).toBe('object');
    });

    test('should have valid popup configuration', () => {
      expect(manifestData.action.default_popup).toBe('popup.html');
      expect(typeof manifestData.action.default_popup).toBe('string');
    });

    test('should have proper file extension for popup', () => {
      expect(manifestData.action.default_popup).toMatch(/\.html$/);
    });

    test('should not have browser_action (MV2 property)', () => {
      expect(manifestData.browser_action).toBeUndefined();
    });

    test('should not have page_action (MV2 property)', () => {
      expect(manifestData.page_action).toBeUndefined();
    });
  });

  describe('Security and best practices', () => {
    test('should not include deprecated properties', () => {
      const deprecatedProperties = [
        'browser_action',
        'page_action'
      ];
      
      deprecatedProperties.forEach(prop => {
        expect(manifestData[prop]).toBeUndefined();
      });
    });

    test('should not have overly permissive permissions', () => {
      const dangerousPermissions = [
        'debugger',
        'desktopCapture',
        'management',
        'nativeMessaging',
        'enterprise.deviceAttributes',
        'enterprise.hardwarePlatform'
      ];
      
      dangerousPermissions.forEach(permission => {
        expect(manifestData.permissions).not.toContain(permission);
      });
    });

    test('should have reasonable file size', () => {
      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
      expect(manifestContent.length).toBeLessThan(8192); // 8KB should be more than enough
      expect(manifestContent.length).toBeGreaterThan(0);
    });

    test('should not include content_security_policy for MV3', () => {
      expect(manifestData.content_security_policy).toBeUndefined();
    });

    test('should not have web_accessible_resources in old format', () => {
      if (manifestData.web_accessible_resources) {
        expect(Array.isArray(manifestData.web_accessible_resources)).toBe(true);
        manifestData.web_accessible_resources.forEach(resource => {
          expect(resource).toHaveProperty('resources');
          expect(resource).toHaveProperty('matches');
        });
      }
    });
  });

  describe('Extension functionality alignment', () => {
    test('should have permissions aligned with font replacement functionality', () => {
      // For font replacement, we need activeTab and scripting
      expect(manifestData.permissions).toContain('activeTab');
      expect(manifestData.permissions).toContain('scripting');
      // Storage for saving user preferences
      expect(manifestData.permissions).toContain('storage');
    });

    test('should have host permissions for all URLs for font replacement', () => {
      // Font replacement needs to work on all websites
      expect(manifestData.host_permissions).toContain('<all_urls>');
    });

    test('should have content scripts for DOM manipulation', () => {
      // Font replacement requires content scripts to modify page styles
      expect(manifestData.content_scripts).toBeDefined();
      expect(manifestData.content_scripts.length).toBeGreaterThan(0);
      expect(manifestData.content_scripts[0].matches).toContain('<all_urls>');
    });

    test('should use document_idle for safe font replacement', () => {
      // Font replacement should happen after document is loaded
      expect(manifestData.content_scripts[0].run_at).toBe('document_idle');
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle missing optional properties gracefully', () => {
      // Test that the manifest doesn't break if optional properties are missing
      const optionalProperties = ['icons', 'default_locale', 'homepage_url', 'short_name'];
      optionalProperties.forEach(prop => {
        // These are optional, so they can be undefined
        if (manifestData[prop] !== undefined) {
          expect(typeof manifestData[prop]).toBeDefined();
        }
      });
    });

    test('should not have empty arrays for required array properties', () => {
      const arrayProperties = ['permissions', 'host_permissions', 'content_scripts'];
      arrayProperties.forEach(prop => {
        if (manifestData[prop]) {
          expect(Array.isArray(manifestData[prop])).toBe(true);
          expect(manifestData[prop].length).toBeGreaterThan(0);
        }
      });
    });

    test('should not have null or undefined required values', () => {
      const requiredProperties = ['manifest_version', 'name', 'version'];
      requiredProperties.forEach(prop => {
        expect(manifestData[prop]).not.toBeNull();
        expect(manifestData[prop]).not.toBeUndefined();
        expect(manifestData[prop]).not.toBe('');
      });
    });

    test('should handle unicode characters properly', () => {
      // Test Japanese characters in description are properly encoded
      expect(manifestData.description).toContain('現在');
      expect(manifestData.description).toContain('フォント');
      expect(manifestData.description).toContain('Webフォント');
    });
  });

  describe('JSON format validation', () => {
    test('should be properly formatted JSON without syntax errors', () => {
      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
      expect(() => JSON.parse(manifestContent)).not.toThrow();
    });

    test('should not have trailing commas', () => {
      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
      // Check for trailing commas which are invalid in JSON
      expect(manifestContent).not.toMatch(/,\s*[}\]]/);
    });

    test('should use double quotes for strings', () => {
      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
      // JSON requires double quotes, not single quotes
      expect(manifestContent).not.toMatch(/'[^']*'/);
    });

    test('should have consistent indentation', () => {
      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
      const lines = manifestContent.split('\n');
      // Check that indentation is consistent (2 spaces per level)
      lines.forEach((line, index) => {
        if (line.trim().length > 0) {
          const indentation = line.match(/^(\s*)/)[1];
          expect(indentation.length % 2).toBe(0); // Should be even number of spaces
        }
      });
    });

    test('should not contain comments', () => {
      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
      // JSON doesn't support comments
      expect(manifestContent).not.toMatch(/\/\//);
      expect(manifestContent).not.toMatch(/\/\*/);
    });
  });

  describe('Performance and optimization', () => {
    test('should have minimal required permissions only', () => {
      // Only include necessary permissions for functionality
      const expectedPermissions = ['storage', 'scripting', 'activeTab'];
      expect(manifestData.permissions.length).toBe(expectedPermissions.length);
    });

    test('should use efficient content script injection', () => {
      // Using document_idle is efficient for font replacement
      expect(manifestData.content_scripts[0].run_at).toBe('document_idle');
    });

    test('should not include unnecessary match patterns', () => {
      // Using <all_urls> is appropriate for font replacement on any site
      expect(manifestData.content_scripts[0].matches).toEqual(['<all_urls>']);
    });
  });

  describe('Compatibility and standards', () => {
    test('should be compatible with Chrome Extension API', () => {
      // Manifest V3 properties should be used
      expect(manifestData.manifest_version).toBe(3);
      expect(manifestData.action).toBeDefined();
      expect(manifestData.background.service_worker).toBeDefined();
    });

    test('should not use deprecated match patterns', () => {
      // Check for proper URL pattern format
      manifestData.content_scripts.forEach(script => {
        script.matches.forEach(match => {
          expect(match).toBe('<all_urls>'); // For this specific extension
        });
      });
    });

    test('should follow naming conventions', () => {
      // File names should be lowercase with proper extensions
      expect(manifestData.background.service_worker).toBe('background.js');
      expect(manifestData.action.default_popup).toBe('popup.html');
      expect(manifestData.options_ui.page).toBe('options.html');
      expect(manifestData.content_scripts[0].js[0]).toBe('content.js');
    });
  });
});