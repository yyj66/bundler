const fs=require('fs');
const parser=require('@babel/parser');//解析源代码生成抽象语法树ast
const traverse=require('@babel/traverse').default// 遍历ast，转换ast
const path=require('path');
const babel=require('@babel/core');


const moduleAnalyser=(filename)=>{
    //要解析入口文件，首先要拿到入口文件的内容，使用node的fs模块，读取文件的内容
    const content=fs.readFileSync(filename,'utf-8');
    // 通过@babel/parser，解析源代码，生成抽象语法树
    const ast=parser.parse(content,{
        sourceType:'module'
    });

    const dependencies={};
    // 通过@babel/traverse 遍历ast
   traverse(ast,{
        ImportDeclaration({node}){
            const dir=path.dirname(filename);
            const newFile=path.join(dir,node.source.value);

            dependencies[node.source.value]=newFile;
        }
   });
  const {code}= babel.transformFromAst(ast,null,{
       presets:['@babel/preset-env']
   })

    return {
        filename,
        dependencies,
        code
    }
}


const makeDependencyGraph=(entry)=>{
    const entryModule=moduleAnalyser(entry);
    const graphArray=[entryModule];
    for(let i=0;i<graphArray.length;i++){
        const item=graphArray[i];
        const {dependencies}=item;
        for(k in dependencies){
            const subModule=moduleAnalyser(dependencies[k]);
            graphArray.push(subModule);
        }
    }  

    const graph={};
    graphArray.forEach(item=>{
        graph[item.filename]={
            dependencies:item.dependencies,
            code:item.code
        }
    })
    
    return graph;
}



const generateCode=(entry)=>{
    const graph=JSON.stringify(makeDependencyGraph(entry)) ;
    return `
        (function(graph){
            function require(module){
                function localRequire(relativePath){
                    return require(graph[module].dependencies[relativePath]);
                }

                var exports={};
                (function(localRequire,exports,code){
                    eval(code);
                })(localRequire,exports,graph[module].code)

                return exports;

            };

            require('${entry}');

        })(${graph});
    `;
}

const result= generateCode('./src/index.js');
console.log(result);


// const result= moduleAnalyser('./src/index.js');
// console.log(result);
