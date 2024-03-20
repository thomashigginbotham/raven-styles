/**
 * Reads style sheets for use of custom environment variables used within
 * container queries and replaces their values with CSS custom properties
 * defined on the :root element.
 */
export async function customEnvPolyfill() {
  // Find all style sheets and wait for them to load.
  /** @type {HTMLLinkElement[]}  */
  const styleSheets = [...document.querySelectorAll('link[rel="stylesheet"]')];
  const loadedPromises = styleSheets.map((styleSheet) => {
    try {
      if (styleSheet.sheet.cssRules) {
        return Promise.resolve();
      }
    } catch (e) {
      // Style sheet's rules could not be loaded.
      console.log(e);
      return Promise.resolve();
    }

    return new Promise(
      (resolve) => styleSheet.addEventListener('load', resolve),
    );
  });

  await Promise.all(loadedPromises);

  // Insert new rules for each style sheet.
  styleSheets.forEach((styleSheet) => {
    try {
      const newRules = getNewContainerRuleConditions(styleSheet.sheet.cssRules);
      const styleElement = document.createElement('style');

      newRules.forEach((newRule) => styleElement.textContent += newRule);

      document.head.appendChild(styleElement);
    } catch (e) {
      console.log(e);
    }
  });
}

/**
 * Finds container rules and returns rules with updated conditions.
 *
 * @param {CSSRuleList} rules - The style sheet rules.
 * @return {string[]} - The updated rules.
 */
function getNewContainerRuleConditions(rules) {
  const newRules = [];

  // Get import rules and recursively update them.
  const importRules = [...rules].filter((rule) => rule.href);

  importRules.forEach((/** @type {CSSImportRule} */rule) => {
    const newImportedRules = getNewContainerRuleConditions(
      rule.styleSheet.cssRules,
    );

    if (rule.layerName === undefined) {
      newRules.push(...newImportedRules);
    } else {
      newRules.push(...newImportedRules.map((newImportedRule) => (
        `@layer ${rule.layerName} {${newImportedRule}}`
      )));
    }
  });

  // Get layer rules and recursively update them.
  const layerRules = [...rules].filter((rule) => rule.name !== undefined);

  layerRules.forEach((/** @type {CSSLayerBlockRule} */rule) => {
    const newLayerRules = getNewContainerRuleConditions(rule.cssRules);

    newRules.push(...newLayerRules.map((newLayerRule) => (
      `@layer ${rule.name} {${newLayerRule}}`
    )));
  });

  // Get container rules.
  const containerRules = [...rules].filter((rule) => rule.conditionText);
  const rootStyle = getComputedStyle(document.documentElement);

  containerRules.forEach((/** @type {CSSContainerRule} */rule) => {
    const envVarMatches = rule.conditionText.matchAll(/env\((--[^\)]+)\)/g);

    // Replace condition text with custom property value.
    [...envVarMatches].forEach((envVarMatchGroups) => {
      const envVar = envVarMatchGroups?.[1];
      const customPropValue = rootStyle.getPropertyValue(envVar);

      if (customPropValue === '') {
        return;
      }

      const newCssText = rule.cssText.replace(
        `env(${envVar})`,
        customPropValue,
      );

      newRules.push(newCssText);
    });
  });

  return newRules;
}
