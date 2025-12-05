
mvnH() {
  # for reference
    while getopts "hm:d" flag; do :
        case $flag in 
            h) echo "-m project_name - to create a project" 
                ;;
            d) echo "doing" 
                ;;
            m) 
                filename=$OPTARG
                mvn archetype:generate -DgroupId=app -DartifactId=$filename -DarchetypeArtifactId=maven-archetype-quickstart -DarchetypeVersion=1.5 -DinteractiveMode=false ;
                echo "$filename created!";
                ;;
        esac
    done
}
mkjava() {
  mvn archetype:generate -DgroupId=app -DartifactId=$1 -DarchetypeArtifactId=maven-archetype-quickstart -DarchetypeVersion=1.5 -DinteractiveMode=false ;
}
