# Overcoming AI Context Window Limitations with symref

## The Challenge

AI code assistants face critical limitations due to their context window constraints:
- Cannot see the entire codebase at once
- May miss important dependencies
- Limited visibility of call hierarchies
- Risk of incomplete refactoring
- Potential for dead code generation

symref provides simple, one-line commands to overcome these limitations.

## Essential Checks for AI Code Generation

### 1. Entry Point Verification
Ensure your changes are actually reachable from entry points:
```bash
# Check if your new/modified function is called
symref refs yourFunction -d ./src

# Find all entry points (e.g., main functions, exported symbols)
symref refs "main,index,app" --include "src/**/*.ts"
```

### 2. Interface Implementation Verification
When modifying interfaces or abstract classes:
```bash
# Find all implementations that need updating
symref refs IYourInterface -d ./src

# Check if implementation matches interface
symref refs "YourClass,IYourInterface" --include "src/**/*.ts"
```

### 3. Call Site Updates
After modifying function signatures or variables:
```bash
# Find ALL places that need updates
symref refs modifiedFunction -d ./src

# Check related functions that might need updates
symref refs "*similarFunction*" --include "src/**/*.ts"
```

### 4. Dead Code Prevention
Before and after changes:
```bash
# Check if old code is still referenced
symref refs oldFunction -d ./src

# Find dead code in modified files
symref dead src/path/to/modified/file.ts
```

### 5. Dependency Chain Verification
Ensure proper integration in the dependency chain:
```bash
# Find all dependencies
symref refs "*ServiceA*,*ServiceB*" --include "src/**/*.ts"

# Check circular dependencies
symref refs ServiceA -d ./src
symref refs ServiceB -d ./src
```

## Quick Reference for Common AI Limitations

### 1. "Can't See Full Call Stack"
```bash
# Find all callers
symref refs targetFunction -d ./src
```

### 2. "Missing Implementation Updates"
```bash
# Find all implementations
symref refs "IInterface,AbstractClass" -d ./src
```

### 3. "Incomplete Variable Updates"
```bash
# Find all variable references
symref refs variableName -d ./src
```

### 4. "Dead Code Generation"
```bash
# Check before deletion
symref refs oldCode -d ./src

# Verify after changes
symref dead src/modified/file.ts
```

### 5. "Missing Entry Points"
```bash
# Find reachability
symref refs "exportedFunction,publicAPI" -d ./src
```

## Best Practices for AI Code Generation

### 1. Before Generating Code
```bash
# Check existing implementations
symref refs "*similar*" --include "src/**/*.ts"
```

### 2. After Generating Code
```bash
# Verify integration
symref refs newFunction -d ./src

# Check for dead code
symref dead src/new/file.ts
```

### 3. During Refactoring
```bash
# Before moving/renaming
symref refs targetSymbol -d ./src

# After changes
symref refs newSymbol -d ./src
symref dead src/modified/file.ts
```

## Key Points to Remember

1. **Always Verify Reachability**
   - Check entry points
   - Verify call chains
   - Confirm exports are used

2. **Complete Implementation Updates**
   - Find all implementations
   - Update all call sites
   - Verify interface compliance

3. **Prevent Code Rot**
   - Check for dead code
   - Verify all references
   - Clean up unused imports

4. **Maintain Dependencies**
   - Verify dependency chains
   - Check circular references
   - Ensure proper integration

Remember: symref is your solution to overcome AI's context limitations. One command can reveal what might be hidden outside your context window.
