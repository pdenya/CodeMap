## Code Navigation

**.codemap/** - Pre-extracted functions/comments.

**Files**:
- `.codemap/codemap.md` - Full app code map, functions and comments
- `.codemap/{dir}/codemap.md` - Directory-specific functions, mirrored from the codebase.

**Usage**:
- Initial codebase exploration: `Read .codemap/codemap.md`
- Targeted exploration: Get an overview of all files in a directory with subfolder codemaps. To list them all `find .codemap | grep md$`. Submaps will contain only the files/functions/comments that are children of the subfolder.