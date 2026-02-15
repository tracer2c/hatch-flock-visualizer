

## Fix: Residue Analysis Tab Still Showing Edit/Delete Buttons in View-Only Mode

### Problem
The Residue Analysis tab was missed during the previous write-protection update. Two issues:
1. `CompleteDataView.tsx` does not pass `readOnly` to `ResidueBreakoutTab`
2. `ResidueBreakoutTab` and `ResidueBreakoutTable` don't accept or use a `readOnly` prop

### Fix (3 files)

#### 1. `src/components/dashboard/CompleteDataView.tsx` (line 333)
Pass `readOnly` to `ResidueBreakoutTab`:
```
return <ResidueBreakoutTab data={data} ... readOnly={readOnly} />;
```

#### 2. `src/components/dashboard/ResidueBreakoutTab.tsx`
Add `readOnly?: boolean` to the props interface and pass it through to `ResidueBreakoutTable`.

#### 3. `src/components/dashboard/ResidueBreakoutTable.tsx`
- Add `readOnly?: boolean` to the props interface
- Conditionally hide the "Actions" column header when `readOnly` is true
- Hide the Edit and Delete buttons in each row when `readOnly` is true
- Disable the "Save Changes" button in the edit dialog as a safety net

### What stays the same
No database, routing, or other component changes needed. This is purely passing the existing `readOnly` flag through to the one tab that was missed.

